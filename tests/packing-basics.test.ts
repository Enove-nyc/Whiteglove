import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PACKING_BASICS } from "@/data/packing-basics";
import { byCategory } from "@/data/packing-list";

describe("the starter packing list", () => {
  it("every line has an id, a label and a category", () => {
    for (const item of PACKING_BASICS) {
      assert.ok(item.id.trim(), "a line with no id cannot be checked off");
      assert.ok(item.label.trim());
      assert.ok(item.category.trim());
    }
  });

  it("no id repeats, so ticking one line never ticks another", () => {
    const ids = PACKING_BASICS.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("each category's lines are together, so the page draws one block each", () => {
    // byCategory groups by first appearance; a category split in two places in
    // the source would draw as two headings with the same name.
    const groups = byCategory(PACKING_BASICS.map((i) => ({ ...i, checked: false })));
    assert.equal(new Set(groups.map((g) => g.category)).size, groups.length);
  });

  it("it says what to bring and never whether to go", () => {
    // AGENTS.md: information, not hashkafa. A packing line names a thing.
    const text = PACKING_BASICS.map((i) => i.label).join(" ");
    assert.doesNotMatch(text, /ask your rov|should you|be careful|make sure to consult/i);
  });

  it("it is short enough to read and long enough to be worth opening", () => {
    assert.ok(PACKING_BASICS.length >= 20 && PACKING_BASICS.length <= 45, `${PACKING_BASICS.length} lines`);
  });
});
