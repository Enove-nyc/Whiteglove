/**
 * What is published, what is not ready, and what is queued.
 *
 *   npm run audit:pipeline
 *
 * Three sections, in the order somebody working on the vacation list needs
 * them:
 *
 *   1. Every published destination against the five publication checks. A
 *      destination below the bar is not a crisis and is not left silent
 *      either — it is named, with what it is missing.
 *   2. The gaps across the whole list, counted, so the biggest one is visible.
 *   3. The queue from data/vacation-pipeline.ts, with what each candidate
 *      still needs before it can be written up.
 *
 * Nothing here reaches the network or the database: it reads the built-in data
 * files, which is what a deploy publishes. Owner-added entries only ever raise
 * a destination's score, never lower it, so a pass here is a floor.
 */

import { spawnSync } from "node:child_process";

const script = `
import { vacationDestinations, TRIP_THEMES } from "@/data/vacation-destinations";
import { attractions } from "@/data/attractions";
import { kosherAreas, kosherStays } from "@/data/kosher-stays";
import { kosherEateries } from "@/data/kosher-eateries";
import { readinessOfAll, backlog, missingByCheck } from "@/lib/destination-readiness";
import { PIPELINE, PIPELINE_GROUPS, NEW_THEME_THRESHOLD, candidatesIn } from "@/data/vacation-pipeline";

const sources = { attractions, stays: kosherStays, areas: kosherAreas, eateries: kosherEateries };
const all = readinessOfAll(vacationDestinations, sources);
const notReady = backlog(all);

console.log("===== PUBLISHED (" + all.length + ") =====");
for (const entry of all) {
  const mark = entry.publishable ? "ok  " : "MISS";
  console.log(\`\${mark} \${String(entry.met)}/5  \${entry.slug}\`);
  if (!entry.publishable) {
    for (const check of entry.checks.filter((c) => !c.met)) console.log("       - " + check.label + ": " + check.detail);
  }
}

console.log("\\n===== WHERE THE LIST IS THIN =====");
for (const gap of missingByCheck(all)) {
  console.log(\`\${String(gap.missing).padStart(3)} destination(s) cannot answer: \${gap.label}\`);
}
console.log("");
for (const theme of TRIP_THEMES) {
  const count = vacationDestinations.filter((d) => d.themes.includes(theme.value)).length;
  const flag = count < NEW_THEME_THRESHOLD ? "  <- thin; the front page hides this count" : "";
  console.log(\`\${String(count).padStart(3)}  \${theme.label}\${flag}\`);
}

console.log("\\n===== QUEUED (" + PIPELINE.length + " candidates, " + PIPELINE_GROUPS.length + " groups) =====");
for (const group of PIPELINE_GROUPS) {
  const candidates = candidatesIn(group.id);
  console.log(\`\\n-- \${group.label} (\${candidates.length}) \${group.newTheme ? "[needs a new category: " + group.newTheme.label + "]" : ""}\`);
  if (candidates.length === 0) {
    console.log("   nothing queued yet");
    continue;
  }
  for (const candidate of candidates) {
    console.log(\`   \${candidate.slug} — \${candidate.name}, \${candidate.country}\`);
    console.log(\`     cities: \${candidate.cities.join(", ")}\${candidate.kosherBase ? " (base: " + candidate.kosherBase.join(", ") + ")" : ""}\`);
    for (const need of candidate.needs) console.log("     - " + need);
  }
}

console.log(\`\\n\${all.length - notReady.length}/\${all.length} published destinations clear the bar; \${PIPELINE.length} queued.\`);
if (notReady.length) process.exitCode = 1;
`;

const result = spawnSync("npx", ["tsx", "-e", script], { stdio: "inherit" });
process.exit(result.status ?? 0);
