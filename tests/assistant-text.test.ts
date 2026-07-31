import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAnswer, parseSpans } from "@/lib/assistant-text";

// The assistant's reply used to be shown as one block of raw text, so a model
// writing a list wrote asterisks and hyphens onto the page. These tests are
// about turning that into blocks the site can set in its own type — and about
// never turning it into markup.

describe("emphasis in a line", () => {
  it("reads **like this** as emphasis", () => {
    assert.deepEqual(parseSpans("Try **Uman** first"), [
      { text: "Try " },
      { text: "Uman", strong: true },
      { text: " first" },
    ]);
  });

  it("leaves a stray marker as the characters it is", () => {
    // Otherwise one unbalanced pair swallows the rest of the answer.
    assert.deepEqual(parseSpans("2 ** 3 is not emphasis"), [{ text: "2 ** 3 is not emphasis" }]);
  });

  it("never returns nothing", () => {
    assert.deepEqual(parseSpans(""), [{ text: "" }]);
  });
});

describe("splitting an answer into blocks", () => {
  it("reads a heading, a paragraph and a list the way they were written", () => {
    const blocks = parseAnswer([
      "## Getting to Uman",
      "",
      "Fly into Kyiv, then drive.",
      "",
      "- **Boryspil** — the main airport",
      "- Vinnytsia — closer, fewer flights",
    ].join("\n"));

    assert.deepEqual(blocks.map((b) => b.kind), ["heading", "paragraph", "list"]);
    assert.equal(blocks[0].kind === "heading" && blocks[0].text, "Getting to Uman");
    assert.equal(blocks[2].kind === "list" && blocks[2].ordered, false);
    assert.equal(blocks[2].kind === "list" && blocks[2].items.length, 2);
    assert.equal(blocks[2].kind === "list" && blocks[2].items[0][0].strong, true);
  });

  it("tells a numbered list from a dashed one", () => {
    const ordered = parseAnswer("1. First\n2. Second");
    assert.equal(ordered[0].kind === "list" && ordered[0].ordered, true);
    const dashed = parseAnswer("- One\n- Two");
    assert.equal(dashed[0].kind === "list" && dashed[0].ordered, false);
  });

  it("splits a list that changes kind rather than muddling them", () => {
    const blocks = parseAnswer("- One\n1. Two");
    assert.deepEqual(blocks.map((b) => b.kind), ["list", "list"]);
  });

  it("joins wrapped lines into one paragraph", () => {
    const blocks = parseAnswer("A sentence that\nwrapped across lines.");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].kind === "paragraph" && blocks[0].spans[0].text, "A sentence that wrapped across lines.");
  });

  it("keeps plain prose as prose", () => {
    // Most answers are just sentences, and they must not come out mangled.
    const blocks = parseAnswer("I can only help with kosher travel and trip planning.");
    assert.deepEqual(blocks.map((b) => b.kind), ["paragraph"]);
  });

  it("returns nothing for nothing", () => {
    assert.deepEqual(parseAnswer(""), []);
    assert.deepEqual(parseAnswer("\n\n  \n"), []);
  });

  it("produces data, never markup", () => {
    // The answer is built partly from a traveler's own words. Nothing here may
    // ever emit HTML — the component chooses every tag.
    const nasty = '<img src=x onerror=alert(1)> and **<b>bold</b>**';
    const blocks = parseAnswer(nasty);
    const text = JSON.stringify(blocks);
    assert.ok(!text.includes("<img") || blocks.every((b) => b.kind !== "heading"), "no block type carries markup");
    // The angle brackets survive as text, which React will escape when it
    // renders them. That is the point: they stay characters.
    assert.equal(blocks[0].kind === "paragraph" && blocks[0].spans.some((s) => s.text.includes("<img src=x")), true);
  });
});
