// Write the whole content corpus to a file, without the website running.
//
//   npx tsx scripts/export-content.ts [outfile]
//
// The admin download needs a deployed site and a signed-in browser. This does
// not: it needs a checkout and, for the owner-added half, DATABASE_URL in the
// environment. That matters for the case this whole thing is insurance against —
// the hosting being gone. A checkout of the repository plus the database URL is
// enough to get everything out.
//
// Without DATABASE_URL it still writes a file, containing the built-in content
// only, and says so on stdout rather than pretending it is complete.

import { writeFileSync } from "node:fs";
import { buildContentExport, exportFilename } from "../lib/content-export";

async function main() {
  const now = new Date();
  const data = await buildContentExport(now);
  const out = process.argv[2] ?? exportFilename(now);
  writeFileSync(out, JSON.stringify(data, null, 2), "utf8");

  console.log(`Wrote ${out}`);
  for (const [what, n] of Object.entries(data.counts)) console.log(`  ${what}: ${n}`);
  if (data.builtInOnly) {
    console.log("\nBUILT-IN CONTENT ONLY — the database was not reachable.");
    console.log("Anything added through the admin is NOT in this file. Set DATABASE_URL and run again.");
  }
}

void main();
