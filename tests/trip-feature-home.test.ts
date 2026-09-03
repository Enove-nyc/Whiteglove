import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { test } from "node:test";
import {
  KOSHER_ONLY,
  ON_BOTH,
  OWED_TO_ITINERARIES,
  TRIP_FILE,
  accountedFor,
} from "@/data/trip-feature-home";

/**
 * THE GUARD THAT MAKES THE RULE REAL.
 *
 * AGENTS.md says which product a trip feature belongs to and that the choice
 * is made before the file is written. That is a promise, and promises are what
 * failed here repeatedly — six features were built on the discover-and-plan
 * product and never reached the one whose job they are.
 *
 * So: every trip-shaped file in this repository must be accounted for in
 * data/trip-feature-home.ts. Write a new one without saying which product it
 * is for, and this fails with its name in the message. That is the whole
 * mechanism, and it costs nothing when the answer is obvious.
 */

const ROOTS = ["lib", "data", "components"];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

// The record itself matches the pattern it defines. It is bookkeeping rather
// than trip machinery, so it is excluded here instead of being filed under one
// of its own headings — which would have been a small lie in a file whose
// whole value is being true.
const SELF = "data/trip-feature-home.ts";

const tripFiles = ROOTS.flatMap(walk)
  .filter((path) => path !== SELF && TRIP_FILE.test(path))
  .sort();

test("there are trip-shaped files to check at all — the guard has not gone blind", () => {
  // A regex that stops matching would make every assertion below pass while
  // checking nothing, which is the one way this test could quietly die.
  assert.ok(tripFiles.length > 40, `only ${tripFiles.length} trip files matched — has TRIP_FILE been narrowed?`);
});

test("every trip-shaped file says which product it is for", () => {
  const known = accountedFor();
  const unaccounted = tripFiles.filter((path) => !known.has(path));
  assert.deepEqual(
    unaccounted,
    [],
    `These are trip machinery with no home recorded. Decide in data/trip-feature-home.ts: ON_BOTH once it exists on both deployments, OWED_TO_ITINERARIES if it is build/organise/manage work still only here, or KOSHER_ONLY with a reason.\n  ${unaccounted.join("\n  ")}`,
  );
});

test("nothing is recorded that no longer exists", () => {
  const present = new Set(tripFiles);
  const ghosts = [...accountedFor()].filter((path) => !present.has(path)).sort();
  assert.deepEqual(ghosts, [], `recorded but gone — remove from data/trip-feature-home.ts:\n  ${ghosts.join("\n  ")}`);
});

test("a file is in exactly one list, never two", () => {
  const seen = new Map<string, number>();
  for (const path of [...ON_BOTH, ...Object.keys(KOSHER_ONLY), ...Object.keys(OWED_TO_ITINERARIES)]) {
    seen.set(path, (seen.get(path) ?? 0) + 1);
  }
  assert.deepEqual([...seen].filter(([, n]) => n > 1).map(([p]) => p), []);
});

test("every exception carries a reason, and every debt names its feature", () => {
  for (const [path, reason] of Object.entries(KOSHER_ONLY)) {
    assert.ok(reason.trim().length > 20, `${path} is kosher-only with no real reason given`);
  }
  for (const [path, feature] of Object.entries(OWED_TO_ITINERARIES)) {
    assert.ok(feature.trim().length > 3, `${path} owes a port but names no feature`);
  }
});

test("the one-directional marketing link is never owed to Itineraries", () => {
  // Porting it would have Itineraries pointing home at a kosher site, which is
  // the settled decision this must not quietly undo.
  assert.ok(KOSHER_ONLY["lib/itineraries-handoff.ts"], "the hand-off must stay recorded as kosher-only");
  assert.ok(!OWED_TO_ITINERARIES["lib/itineraries-handoff.ts"]);
  assert.ok(!ON_BOTH.includes("lib/itineraries-handoff.ts"));
});

test("AGENTS.md carries the rule this guard enforces", () => {
  const agents = readFileSync("AGENTS.md", "utf8");
  assert.match(agents, /decided BEFORE it is written/);
  assert.match(agents, /built in the itineraries repository FIRST/);
});
