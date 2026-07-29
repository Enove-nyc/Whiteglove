import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { looksUnanswered, unansweredMessage, type FieldLike } from "../lib/required-fields";

// A field marked required has to actually be required. These pin the two ways
// a person could get past one without answering it — and, just as important,
// the cases that must NOT be caught, because a guard that fires on a real
// answer is worse than no guard at all.

const text = (value: string): FieldLike => ({ kind: "text", value });
const select = (value: string, optionText = ""): FieldLike => ({ kind: "select", value, optionText });

describe("a typed box", () => {
  test("spaces alone are not an answer", () => {
    assert.equal(looksUnanswered(text(" ")), true);
    assert.equal(looksUnanswered(text("   ")), true);
    assert.equal(looksUnanswered(text("\t\n ")), true);
  });

  test("a real answer passes, including one that merely starts with a space", () => {
    assert.equal(looksUnanswered(text("Lizhensk")), false);
    assert.equal(looksUnanswered(text("  Reb Elimelech  ")), false);
    assert.equal(looksUnanswered(text("0")), false);
  });

  test("an outright empty box is left to the browser", () => {
    // It already refuses that one, and saying so twice would replace its
    // message with ours for no gain.
    assert.equal(looksUnanswered(text("")), false);
  });
});

describe("a dropdown", () => {
  test("nothing chosen is not an answer", () => {
    assert.equal(looksUnanswered({ kind: "select", value: "", nothingSelected: true }), true);
    assert.equal(looksUnanswered(select("")), true);
  });

  test("a placeholder option is not an answer, whatever value it carries", () => {
    // The hole: a placeholder with a real value satisfies `required`, so an
    // unmade choice submits as though it were made.
    assert.equal(looksUnanswered(select("none", "— Choose a town —")), true);
    assert.equal(looksUnanswered(select("0", "Select one")), true);
    assert.equal(looksUnanswered(select("x", "Pick a hechsher")), true);
    assert.equal(looksUnanswered(select("any", "Any country")), true);
  });

  test("a real choice passes, even when its words merely contain a stop word", () => {
    assert.equal(looksUnanswered(select("ou", "Orthodox Union")), false);
    assert.equal(looksUnanswered(select("krakow", "Kraków")), false);
    // "Choose" only counts at the start — this is a real option about choosing.
    assert.equal(looksUnanswered(select("guide", "Let us choose a guide for you")), false);
  });
});

describe("everything else", () => {
  test("dates, numbers and checkboxes are the browser's business", () => {
    assert.equal(looksUnanswered({ kind: "other", value: "" }), false);
    assert.equal(looksUnanswered({ kind: "other", value: "2026-08-11" }), false);
  });
});

describe("what it says when it stops you", () => {
  test("names the actual problem rather than repeating the label", () => {
    assert.match(unansweredMessage(text(" ")), /not just a space/i);
    assert.match(unansweredMessage(select("")), /choose/i);
  });
});
