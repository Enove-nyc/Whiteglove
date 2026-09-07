import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Editing an import candidate must never lose the owner's work, and the two
 * things he could not understand must be said plainly with a way to act.
 *
 * On 7 September a save refused to write anything on a stage error, so his
 * edits lived only on screen and vanished when he followed the blocker's
 * advice to another page; "link to an existing destination" was a free-text
 * slug field; and "confirm kosher status in the destination editor" pointed
 * nowhere. These pin the fixes.
 */
const imports = readFileSync("lib/content-imports.ts", "utf8");
const actions = readFileSync("app/admin/imports/actions.ts", "utf8");
const editor = readFileSync("components/ContentImportCandidateEditor.tsx", "utf8");

test("saving a candidate never refuses on a stage error", () => {
  assert.doesNotMatch(imports, /if \(!prepared\.canStage\) throw/, "the pre-write refusal is gone");
});

test("a refused publish says the edits were kept, one reason per line", () => {
  assert.match(actions, /Your edits are saved\. It is not public yet, because:/);
  assert.match(editor, /whitespace-pre-line/);
});

test("the destination is a picker of real towns, and the guidance links to the town page", () => {
  assert.match(editor, /<select name="destinationSlug"/);
  assert.match(editor, /\/admin\/destinations\?slug=/);
  assert.match(editor, /Link verified public listing<\/strong>/);
});
