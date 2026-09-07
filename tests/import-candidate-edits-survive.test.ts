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

test("the fields are controlled, so a returned action cannot reset what was typed", () => {
  // React resets a form submitted through an action; an uncontrolled input
  // then snaps back to its defaultValue. Every typed field binds to state.
  assert.doesNotMatch(editor, /defaultValue=\{candidate\./);
  assert.match(editor, /const \[values, setValues\] = useState\(\(\) => fieldValues\(candidate\)\)/);
  assert.match(editor, /\{\.\.\.bind\("summary"\)\}/);
});

test("kosher food and practical listings publish from the review screen; the town is made if missing", () => {
  const bulk = readFileSync("lib/bulk-content.ts", "utf8");
  assert.doesNotMatch(bulk, /Confirm current kosher status in the destination editor/);
  assert.doesNotMatch(bulk, /Link this (kosher food|practical) listing to an existing destination/);
  assert.match(bulk, /kosherClaim !== "confirmed"/);
  assert.match(imports, /async function destinationIdFor\(/);
  assert.match(imports, /await ensureDestinationForCity\(prepared\.city, prepared\.country\)/);
  assert.doesNotMatch(imports, /Kosher food must be confirmed in the destination editor/);
  assert.match(editor, /Checked — kosher/);
});

test("a candidate can be skipped for the next one waiting", () => {
  const page = readFileSync("app/admin/imports/[id]/page.tsx", "utf8");
  assert.match(page, /nextReviewCandidateAfter\(candidate\.id\)/);
  assert.match(page, /key=\{candidate\.id\}/);
});
