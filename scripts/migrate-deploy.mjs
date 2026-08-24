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

function attemptMigrate() {
  // Piped rather than inherited so the output can be classified, then printed
  // as it was — the deploy log should read exactly as it did before.
  const run = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env: process.env,
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  // A spawn that could not start at all (npx missing) has no status.
  return { ok: run.status === 0, output: run.error ? String(run.error) : output };
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
