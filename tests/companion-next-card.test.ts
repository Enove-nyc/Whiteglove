import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";
import { followAlong } from "@/lib/trip-progress";

const APP = codeOf("components/companion/CompanionApp.tsx");

/**
 * The traveller's app opens on what happens next.
 *
 * The planner is dense because an advisor is deciding things. The app is the
 * opposite: somebody opens it on a pavement in a city they do not know, and
 * the only question is what happens now and how do I reach it. That answer
 * was already computed and already on the screen — as a highlighted row
 * part-way down a list, under a 196-pixel panel showing a picture of a
 * suitcase. These pin the swap.
 */

describe("what is next is the first thing on the screen", () => {
  it("the decorative panel gives way to it while a trip is running", () => {
    assert.match(APP, /\{showNextCard \? \(/);
    // The panel is the else branch now, not the unconditional opening.
    const home = APP.slice(APP.indexOf("const homeScreen = ("));
    const branch = home.indexOf("showNextCard ? (");
    const suitcase = home.indexOf('name="suitcase"');
    assert.ok(branch !== -1 && suitcase > branch, "the suitcase panel should be the fallback, not the default");
  });

  it("it appears only while the trip is actually running", () => {
    // Not before it, not after it, and not on a day with nothing timed left.
    assert.match(APP, /const showNextCard = selIsToday && !trip\.tripFinished && Boolean\(nowOrNext\)/);
  });

  it("it shows what is happening now in preference to what is next", () => {
    assert.match(APP, /const nowOrNext = nowIdx !== null \? items\[nowIdx\] : nextIdx !== null \? items\[nextIdx\] : null/);
  });

  it("it opens the right stop, through the helper the day rows already use", () => {
    // Hand-rolled navigation here first, and set a field that does not exist
    // on the state — which would have opened whichever stop was last viewed.
    assert.match(APP, /onClick=\{\(\) => openActivity\(curDay, nowOrNextIsNow \? nowIdx! : nextIdx!\)\}/);
  });
});

describe("the actions belong to the thing, and are honest about it", () => {
  it("calling, walking and the confirmation are on this screen, not one tap in", () => {
    const actions = APP.slice(APP.indexOf("const nextActions ="), APP.indexOf("const homeScreen = ("));
    assert.match(actions, /tel:/);
    assert.match(actions, /google\.com\/maps\/search/);
    assert.match(actions, /Confirmation/);
  });

  it("each one appears only when the stop actually has it", () => {
    const actions = APP.slice(APP.indexOf("const nextActions ="), APP.indexOf("const homeScreen = ("));
    assert.match(actions, /\{nowOrNext\.phone && \(/);
    assert.match(actions, /\{nowOrNext\.href && \(/);
    // Directions to a flight or a train is not a thing — the activity screen
    // makes the same exclusion.
    assert.match(actions, /nowOrNext\.kind !== "travel"/);
  });

  it("the links sit outside the button, not nested inside it", () => {
    // A link inside a button is not something a browser or a screen reader
    // can make sense of.
    const card = APP.slice(APP.indexOf("const nextCard ="), APP.indexOf("const nextActions ="));
    assert.doesNotMatch(card, /<a\s/);
  });
});

describe("the answer it shows is the one trip-progress computes", () => {
  const stops = [
    { id: "0", name: "Driver pickup", arrivalTime: "09:30" },
    { id: "1", name: "Tour", arrivalTime: "11:00" },
    { id: "2", name: "Dinner", arrivalTime: "19:00" },
  ];

  it("before the day starts, the first stop is next", () => {
    const follow = followAlong({ stops, nowMinutes: 8 * 60 });
    assert.equal(follow.next?.name, "Driver pickup");
  });

  it("mid-morning it has moved on", () => {
    const follow = followAlong({ stops, nowMinutes: 10 * 60 });
    assert.equal(follow.next?.name, "Tour");
  });

  it("after the last one there is nothing further to be next", () => {
    assert.equal(followAlong({ stops, nowMinutes: 22 * 60 }).next, null);
  });

  it("with no clock to read it falls back to the first stop, not to nothing", () => {
    // A phone that cannot say what time it is still knows what the day holds,
    // and the first stop is the honest answer to "what is next" — better than
    // an empty screen.
    const follow = followAlong({ stops, nowMinutes: null });
    assert.equal(follow.next?.name, "Driver pickup");
    assert.equal(follow.now, null);
  });

  it("once the last stop is under way, that is what it shows", () => {
    const follow = followAlong({ stops, nowMinutes: 22 * 60 });
    assert.equal(follow.now?.name, "Dinner");
  });
});
