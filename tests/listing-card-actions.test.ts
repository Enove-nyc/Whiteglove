import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * A directory card offers a choice, not a wall.
 *
 * WHAT WAS ON ONE. A things-to-do card carried nine controls at once —
 * Navigate, Website, Full guide, Kosher food near here, Add to Route, Add to
 * Itinerary, Where to stay, Plan a trip here, Rate, Suggest edit — on every
 * one of several hundred cards. A places-to-stay card carried eight. Nine
 * options presented at once is not a choice; and a screen reader reading the
 * page's links got the same nine names in the same order, over and over, with
 * the place's name nowhere near them.
 *
 * WHAT STAYS OUTSIDE. The one thing the card is for — its guide, or checking
 * dates for the town — and the buttons that put the place into a trip. Those
 * are why somebody is reading a directory rather than a guide. Everything else
 * is a second thought and lives one press away.
 *
 * NATIVE <details>, not a custom menu: it needs no JavaScript, opens with the
 * keyboard, announces its own state, and its contents stay in the HTML for a
 * crawler.
 */

const MORE = readFileSync("components/MoreActions.tsx", "utf8");

describe("the More disclosure is a real disclosure", () => {
  it("is a details element, not a hand-rolled popover", () => {
    assert.match(MORE, /<details/);
    assert.match(MORE, /<summary/);
  });

  it("says what it is more OF", () => {
    // A page has fifty of these. Fifty controls all named "More" are fifty
    // identical rows in the list a screen reader offers.
    assert.match(MORE, /sr-only"> for \{label\}/);
  });

  it("keeps a full-size target", () => {
    assert.match(MORE, /min-h-11/);
  });
});

describe("the cards that had a wall of actions", () => {
  const CARDS: Array<[string, string[], string[]]> = [
    [
      "components/AttractionDirectory.tsx",
      // Out here: the guide, and the two that put it on a trip.
      ["Full guide", "SaveTripItemButton", "AddToItineraryButton"],
      // Behind More.
      ["Navigate →", "Website ↗", "Kosher food near here", "Where to stay in", "Plan a trip here", "RateExperienceLink", "SuggestEditPanel"],
    ],
    [
      "components/KosherStayDirectory.tsx",
      ["Check dates in", "AddToItineraryButton"],
      ["Navigate to", "Their site", "within walking distance", "Things to do in", "RateExperienceLink", "SuggestEditPanel"],
    ],
  ];

  for (const [file, primary, secondary] of CARDS) {
    const source = readFileSync(file, "utf8");
    const at = source.indexOf("<MoreActions");
    const end = source.indexOf("</MoreActions>");

    it(`${file} has a More disclosure`, () => {
      assert.ok(at > 0, `${file} still shows every action at once`);
      assert.ok(end > at);
    });

    for (const action of primary) {
      it(`${file} keeps ${action} in front`, () => {
        const before = source.slice(0, at);
        assert.ok(before.includes(action), `${action} was pushed behind More`);
      });
    }

    for (const action of secondary) {
      it(`${file} puts ${action} behind More`, () => {
        const inside = source.slice(at, end);
        assert.ok(inside.includes(action), `${action} is still shown on every card`);
      });
    }
  }

  it("no card shows a rating prompt in front", () => {
    // A rating asks how a place was. It belongs where somebody has read about
    // that one place, not on a list of two hundred they have not been to.
    for (const [file] of CARDS) {
      const source = readFileSync(file, "utf8");
      const before = source.slice(0, source.indexOf("<MoreActions"));
      assert.doesNotMatch(before, /<RateExperienceLink/, `${file} rates from the list`);
    }
  });
});

describe("a browse tile announces what it shows", () => {
  const CARD = readFileSync("components/VacationCard.tsx", "utf8");

  /**
   * IT WAS INSIDE OUT. The visible label on each status chip was aria-hidden
   * and an sr-only span carried the full sentence, so a screen reader got two
   * paragraphs per tile — 285 characters to say two things that fit in six
   * words — across a hundred and fifty-six tiles on /destinations, while a
   * sighted reader got the six words. The two audiences were being handed
   * different cards, and the one that could not see it got the longer one.
   */
  it("the chip's label is readable, not hidden", () => {
    const chip = CARD.slice(CARD.indexOf("function SignalChip"), CARD.indexOf("A heritage town's card"));
    assert.match(chip, /<span>\{signal\.label\}<\/span>/, "the label is hidden from assistive technology again");
    assert.doesNotMatch(chip, /sr-only">\{signal\.detail\}/, "the full sentence is announced per tile again");
    // The glyph stays decoration — it is a bullet, not information.
    assert.match(chip, /aria-hidden="true">\{signal\.glyph\}/);
  });

  it("the detail it dropped is still shown somewhere, in full", () => {
    // Not deleted — moved to where there is room for it and somebody asked.
    const page = readFileSync("app/destinations/[destination]/page.tsx", "utf8");
    assert.match(page, /\{signal\.detail\}/, "the destination page no longer shows the detail either");
  });
});
