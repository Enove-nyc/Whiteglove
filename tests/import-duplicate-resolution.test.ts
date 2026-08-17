import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  keepBothIdsFromEvidence,
  mergeKeepBothEvidence,
  noteListWithAliases,
  notesWithAliases,
  parseDuplicateTarget,
  recordKeepBoth,
  uniqueAliases,
} from "../lib/import-duplicate-resolution";

describe("keep both", () => {
  it("records the other id so the pair is not flagged again", () => {
    const next = recordKeepBoth({ checked: "2026-03-03" }, "place:abc");
    assert.deepEqual(keepBothIdsFromEvidence(next), ["place:abc"]);
    assert.equal(next.checked, "2026-03-03");
  });

  it("does not duplicate an id already recorded", () => {
    const next = recordKeepBoth({ keepBothWith: ["place:abc"] }, "place:abc");
    assert.deepEqual(keepBothIdsFromEvidence(next), ["place:abc"]);
  });

  it("keeps the pair when the editor rewrites the evidence blob", () => {
    const next = mergeKeepBothEvidence({ keepBothWith: ["place:abc"], note: "old" }, { checked: "2026-03-03" });
    assert.deepEqual(keepBothIdsFromEvidence(next), ["place:abc"]);
  });
});

describe("merge aliases", () => {
  it("copies only names the kept record does not already have", () => {
    assert.deepEqual(uniqueAliases(["Elimelech of Lizhensk"], ["HaRav Elimelech", "Elimelech of Lizhensk"]), [
      "Elimelech of Lizhensk",
      "HaRav Elimelech",
    ]);
  });

  it("appends aliases to notes without deleting what was there", () => {
    assert.equal(
      notesWithAliases("Near the ohel.", ["Lizhensk Rebbe"]),
      "Near the ohel.\n\nAlso known as: Lizhensk Rebbe.",
    );
    assert.deepEqual(noteListWithAliases(["Near the ohel."], ["Lizhensk Rebbe"]), [
      "Near the ohel.",
      "Also known as: Lizhensk Rebbe.",
    ]);
  });
});

describe("duplicate targets", () => {
  it("reads prefixed ids and treats a bare id as another candidate", () => {
    assert.deepEqual(parseDuplicateTarget("candidate:clxyz"), { kind: "candidate", key: "clxyz" });
    assert.deepEqual(parseDuplicateTarget("place:abc"), { kind: "place", key: "abc" });
    assert.deepEqual(parseDuplicateTarget("clxyz"), { kind: "candidate", key: "clxyz" });
    assert.equal(parseDuplicateTarget(null), null);
  });
});
