import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("content import review regressions", () => {
  it("excludes the current candidate from the final duplicate check", () => {
    const source = readFileSync("lib/content-imports.ts", "utf8");
    assert.match(source, /ownedDuplicateFor\(prepared, id\)/);
  });

  it("lets an editor preserve source evidence through the review form", () => {
    const editor = readFileSync("components/ContentImportCandidateEditor.tsx", "utf8");
    const action = readFileSync("app/admin/imports/actions.ts", "utf8");
    const storage = readFileSync("lib/content-imports.ts", "utf8");

    assert.match(editor, /name="sourceEvidence"/);
    assert.match(action, /sourceEvidence: sourceEvidence\(formData\)/);
    // WHAT THE EDITOR TYPED HAS TO SURVIVE THE SAVE, and this used to be
    // checked by looking for one exact expression —
    // `rawSourceEvidence(prepared.sourceEvidence)`. The save then got better:
    // it reads what is already stored and merges the two, so evidence added by
    // an earlier reviewer is not overwritten by a later one who did not retype
    // it. The behaviour the test exists for is stronger than it was, and the
    // test failed anyway, because it was matching the shape of one line rather
    // than asking whether the evidence gets written.
    assert.match(storage, /mergeKeepBothEvidence\(existing\.sourceEvidence, prepared\.sourceEvidence\)/);
    assert.match(storage, /sourceEvidence: rawSourceEvidence\(evidence\)/);
  });

  it("uses stable source IDs for candidate links while retaining ID lookup compatibility", () => {
    const route = readFileSync("app/admin/imports/[id]/page.tsx", "utf8");
    const queue = readFileSync("lib/import-review-queue.ts", "utf8");

    assert.match(route, /permanentRedirect\(contentImportCandidatePath\(candidate\.sourceId, candidate\.id\)\)/);
    assert.match(queue, /contentImportCandidatePath\(candidate\.sourceId, candidate\.id\)/);
  });
});
