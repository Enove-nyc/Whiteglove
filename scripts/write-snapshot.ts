// Write the database into the repository.
//
//   DATABASE_URL=... npx tsx scripts/write-snapshot.ts
//
// Run on a schedule by .github/workflows/content-snapshot.yml, which commits
// the result if it changed. See lib/content-snapshot.ts for why this exists at
// all — briefly: the content is in two places, git only holds one of them, and
// anybody reading a checkout gets half the truth and does not know it.
//
// REFUSES RATHER THAN OVERWRITES. A run that reaches an empty or wrong database
// produces an empty snapshot, and committing that would replace a true file
// with a false one that looks just as authoritative. It exits non-zero instead,
// leaving the last good copy where it is, and the scheduled run goes red so
// somebody finds out.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { buildContentSnapshot, snapshotProblem, type ContentSnapshot } from "../lib/content-snapshot";

const OUT = "data/snapshot/content.json";

/**
 * Everything except when it was taken.
 *
 * The timestamp moves on every run whether or not a word changed, so comparing
 * whole files would commit a new snapshot every night and bury the one diff
 * that matters — a phone number that moved — in a stream of noise.
 */
function meaningfulPart(snapshot: ContentSnapshot): string {
  return JSON.stringify({ ...snapshot, takenAt: "" });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Nothing to snapshot — the whole point is the database half.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  let snapshot: ContentSnapshot;
  try {
    snapshot = await buildContentSnapshot(prisma, new Date().toISOString());
  } finally {
    await prisma.$disconnect();
  }

  const problem = snapshotProblem(snapshot);
  if (problem) {
    console.error(`Refusing to write: ${problem}`);
    process.exit(1);
  }

  if (existsSync(OUT)) {
    try {
      const previous = JSON.parse(readFileSync(OUT, "utf8")) as ContentSnapshot;
      if (meaningfulPart(previous) === meaningfulPart(snapshot)) {
        console.log("No content changed since the last snapshot.");
        for (const [what, n] of Object.entries(snapshot.counts)) console.log(`  ${what}: ${n}`);
        return;
      }
    } catch {
      // An unreadable previous file is a reason to write a good one, not to stop.
    }
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUT}`);
  for (const [what, n] of Object.entries(snapshot.counts)) console.log(`  ${what}: ${n}`);
}

void main();
