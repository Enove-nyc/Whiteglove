import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mentionsTravelWord, TRAVEL_WORDS } from "@/lib/assistant-topic";

/**
 * The one piece of logic that can turn a real traveller away.
 *
 * It had no test at all, because it lived inside a route file where nothing
 * but a handler may be exported. It turned the owner away from his own site:
 * "high five vacations" was refused as off-topic, because the list held
 * "vacation" and the match demanded a whole word.
 *
 * So the tests here lean almost entirely one way. Letting a junk question
 * through costs one model call. Refusing a real one costs a traveller, and the
 * site never finds out it happened.
 */

describe("what counts as a travel question", () => {
  it("ACCEPTS THE PLURAL OF EVERY WORD ON THE LIST", () => {
    // The exact failure the owner hit.
    assert.equal(mentionsTravelWord("high five vacations"), true);
    assert.equal(mentionsTravelWord("lalechet tours"), true);
    for (const word of ["vacation", "hotel", "flight", "attraction", "kever", "idea", "mountain"]) {
      assert.equal(mentionsTravelWord(`${word}s`), true, `plural of ${word} was refused`);
    }
  });

  it("accepts the ordinary endings people actually type", () => {
    assert.equal(mentionsTravelWord("buses to Lizhensk"), true);
    assert.equal(mentionsTravelWord("walking there"), true);
    assert.equal(mentionsTravelWord("booking a car"), true);
  });

  it("ACCEPTS A QUESTION ABOUT THE PEOPLE WHO ARRANGE TRIPS", () => {
    // The directory is part of this site. Asking after a tour operator by name
    // is as much a travel question as asking after a town, and refusing it is
    // what made the original refusal look absurd.
    for (const q of [
      "who is a good tour operator",
      "any travel agency for Poland",
      "is there a guide in Uman",
      "a driver from the airport",
      "which company runs that programme",
    ]) {
      assert.equal(mentionsTravelWord(q), true, `refused: ${q}`);
    }
  });

  it("still accepts the awkward real phrasings it was built for", () => {
    assert.equal(mentionsTravelWord("We have 4 hours, any ideas?"), true);
    assert.equal(mentionsTravelWord("How far is it from Krakow?"), true);
    assert.equal(mentionsTravelWord("what to do with kids"), true);
  });

  it("multi-word entries still match as phrases", () => {
    assert.equal(mentionsTravelWord("things to do"), true);
    assert.equal(mentionsTravelWord("beis hachaim"), true);
  });

  it("refuses something with no travel in it at all", () => {
    // The gate still has to earn its keep — this is what it exists to avoid
    // paying a model to decline.
    for (const q of ["write me a poem", "what is 2 + 2", "who won the election"]) {
      assert.equal(mentionsTravelWord(q), false, `let through: ${q}`);
    }
  });

  it("says nothing about an empty question", () => {
    assert.equal(mentionsTravelWord(""), false);
    assert.equal(mentionsTravelWord("   "), false);
  });

  it("KEEPS THE LIST SINGULAR, so nobody has to remember both forms", () => {
    // The bug was a missing plural. If plurals creep back into the list the
    // matcher is doing nothing and the next omission returns.
    const plurals = TRAVEL_WORDS.filter((w) => !w.includes(" ") && w.endsWith("s") && !w.endsWith("ss"));
    const allowed = new Set(["sukkos", "shabbos", "kashrus", "hechsherim", "kevarim", "mikvaos", "minyanim", "tzaddikim", "zmanim", "kivrei", "bus", "pas yisroel"]);
    const strays = plurals.filter((w) => !allowed.has(w));
    assert.deepEqual(strays, [], `plurals crept back into the list: ${strays.join(", ")}`);
  });
});
