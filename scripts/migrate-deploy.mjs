#!/usr/bin/env node
/**
 * Run the database migrations, and survive another deploy holding the lock.
 *
 * WHY THIS EXISTS. Every deploy runs `prisma migrate deploy` before the new
 * container is allowed to serve. Prisma takes a Postgres advisory lock first,
 * so two migrations can never run at once — which is right, and is what keeps
 * a half-applied schema from happening. But the wait for that lock is ten
 * seconds, and when two pushes land minutes apart the two deploys overlap:
 * the first takes the lock, the second waits ten seconds, gives up with P1002
 * and the whole deploy fails. The site stays up on the old container, so
 * nothing looks broken — the new code simply never goes live, quietly, until
 * somebody notices the site is stale. That happened for an hour and a half on
 * 24 August: every deploy from both workstreams failed this way.
 *
 * So: wait longer, in a loop, rather than failing on the first refusal.
 *
 * WHAT IS NOT DONE HERE, deliberately:
 *
 *   • The lock is never disabled. Prisma can be told to skip it, and that is
 *     the fix this looks like from a distance — but it is the one thing that
 *     makes concurrent migrations genuinely dangerous rather than merely
 *     inconvenient. The lock is the protection; the timeout was the problem.
 *
 *   • A migration that is actually WRONG still fails, immediately and loudly.
 *     Only being unable to reach or lock the database is retried. A migration
 *     that a database rejects is a fact about the migration, and retrying it
 *     four times only means finding out four times more slowly. Failing shut
 *     is right: the old container keeps serving, and nothing has been half
 *     applied.
 *
 *   • The waiting is bounded. If a lock is held for minutes, something is
 *     wrong that a longer wait will not fix, and the deploy should say so
 *     rather than hang until the platform kills it with no explanation.
 *
 * AND THE REAL CAUSE, fixed below: migrations were running through Neon's
 * CONNECTION POOLER. A Postgres advisory lock belongs to a session, and a
 * pooler hands out a different session per transaction — so the lock could be
 * left held by a pooled connection nobody was using any more, for minutes at a
 * time, which is why waiting alone did not save a deploy. Prisma says it in so
 * many words: migrate wants a direct connection. So the migration takes the
 * unpooled URL when the platform offers one; the running site keeps the pooler,
 * which is what a pooler is for.
 */

import { spawnSync } from "node:child_process";

/** Roughly two and a half minutes of waiting, then give up and report. */
const DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000];

/**
 * Is this failure "somebody else is mid-migration", rather than "this
 * migration is broken"?
 *
 * Matched on Prisma's own error codes and the sentence it prints with them,
 * so a message that changes wording still matches on the code.
 *
 *   P1000  authentication failed          — not transient, do not retry
 *   P1001  cannot reach the database      — transient: it may still be waking
 *   P1002  reached, but timed out         — the advisory-lock case above
 *   P1008  operation timed out
 *   P1017  the server closed the connection
 *
 * Exported for tests: the classifier is the part worth being sure about,
 * because getting it wrong in the "transient" direction would retry a broken
 * migration, and in the other direction would bring the outage back.
 */
export function isTransientMigrateError(output) {
  const text = String(output ?? "");
  if (/\bP1000\b/.test(text)) return false;
  return (
    /\bP100[128]\b/.test(text) ||
    /\bP1017\b/.test(text) ||
    /advisory lock/i.test(text) ||
    /timed out/i.test(text) ||
    /ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(text)
  );
}

/**
 * The connections to try for the MIGRATION, best first.
 *
 * Neon's direct endpoint is its pooled one with "-pooler" taken out of the
 * host — same project, same credentials, same region. Deriving it from
 * DATABASE_URL is the only safe way to name it: this service also carries
 * `databaseneon_*` variables left over from an older, now-unreachable Neon
 * project, and picking one of those by pattern sent a migration at a database
 * in the wrong region that no longer exists. Whatever is tried, it is a
 * rewriting of the URL the app itself uses, or an explicit DIRECT_URL.
 *
 * The pooled URL stays in the list as a fallback: if a direct endpoint cannot
 * be reached, migrating through the pooler is how this always worked, and is
 * better than refusing to deploy.
 */
export function migrationUrls(env) {
  const pooled = env.DATABASE_URL;
  const urls = [];
  if (env.DIRECT_URL) urls.push(env.DIRECT_URL);
  if (pooled && pooled.includes("-pooler.")) urls.push(pooled.replace("-pooler.", "."));
  if (pooled) urls.push(pooled);
  return [...new Set(urls.filter(Boolean))];
}

/** Could not reach the server at all — try the next connection, don't wait. */
function isUnreachable(output) {
  return /\bP1001\b/.test(String(output ?? "")) || /Can't reach database server/i.test(String(output ?? ""));
}

function runMigrate(url) {
  // Piped rather than inherited so the output can be classified, then printed
  // as it was — the deploy log should read exactly as it did before.
  const run = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    // DATABASE_URL is what prisma.config.ts reads. Overridden for this one
    // child process only — the site it is about to start still reads the
    // pooled one from its own environment, which is what a pooler is for.
    env: { ...process.env, ...(url ? { DATABASE_URL: url } : {}) },
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  // A spawn that could not start at all (npx missing) has no status.
  return { ok: run.status === 0, output: run.error ? String(run.error) : output };
}

/** One pass: the direct endpoint if there is one, then the pooled one. */
function attemptMigrate() {
  const urls = migrationUrls(process.env);
  let last = { ok: false, output: "" };
  for (const [index, url] of urls.entries()) {
    last = runMigrate(url);
    if (last.ok) return last;
    if (!isUnreachable(last.output)) return last;
    if (index < urls.length - 1) {
      console.log("[migrate] That endpoint could not be reached — trying the next connection.");
    }
  }
  return last;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  for (let attempt = 0; ; attempt += 1) {
    const { ok, output } = attemptMigrate();
    if (ok) {
      if (attempt > 0) console.log(`[migrate] Applied after ${attempt + 1} attempts.`);
      return 0;
    }
    if (!isTransientMigrateError(output)) {
      console.error("[migrate] The migration itself failed — not retrying.");
      return 1;
    }
    if (attempt >= DELAYS_MS.length) {
      console.error(
        "[migrate] The database stayed locked or unreachable through every retry. " +
          "Another deploy may still be migrating; this one is stopping rather than forcing it.",
      );
      return 1;
    }
    const delay = DELAYS_MS[attempt];
    console.log(
      `[migrate] The database was busy (another deploy is probably migrating). ` +
        `Waiting ${delay / 1000}s, then trying again — attempt ${attempt + 2} of ${DELAYS_MS.length + 1}.`,
    );
    await wait(delay);
  }
}

// Only run when this file IS the command, so a test can import the classifier
// without kicking off a migration.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => process.exit(code));
}
