import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * A decision on an import candidate moves the owner on to the next one waiting
 * (or back to the queue), rather than leaving him on the finished screen.
 */
const actions = readFileSync("app/admin/imports/actions.ts", "utf8");
const imports = readFileSync("lib/content-imports.ts", "utf8");

test("publish, reject, duplicate, merge and link all move on; save and reopen stay", () => {
  assert.match(imports, /export async function nextContentImportCandidateAfter\(/);
  for (const just of ["published", "merged", "linked"]) {
    assert.match(actions, new RegExp(`onward\\("${just}"\\)`), `${just} moves on`);
  }
  // Reject and duplicate share one branch and pick their word with a ternary.
  assert.match(actions, /onward\(intent === "reject" \? "rejected" : "duplicate"\)/, "reject and duplicate move on");
  assert.match(actions, /if \(intent !== "reopen"\) goTo = await onward/, "reopen stays put");
  // The redirect is thrown outside the try, or the catch would swallow it.
  assert.match(actions, /\n  \}\n  if \(goTo\) redirect\(goTo\);\n  return result;\n\}/);
});
