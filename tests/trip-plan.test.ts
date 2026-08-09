import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  emptyAnswers,
  hasAnswers,
  INTERESTS,
  KOSHER_REQUIREMENTS,
  nextStepHref,
  plannerSeed,
  progressOf,
  readAnswers,
  requestMessage,
  requestSubject,
  SHABBOS_REQUIREMENTS,
  STEPS,
  suggestedTheme,
  summarize,
  TRIP_KINDS,
  TRIP_PLAN_KEY,
  tripKind,
  type TripPlanAnswers,
} from "@/lib/trip-plan";

/**
 * The three questions before the planner.
 *
 * TWO FAILURES THESE TESTS EXIST TO PREVENT, and both of them are the kind
 * that lose the customer rather than break the page:
 *
 *   1. A form that will not help somebody who has not chosen a destination.
 *      That person is the whole reason this flow exists, and every question
 *      here is optional so that they can get through it.
 *
 *   2. Making somebody type their dates twice — once into the wizard and once
 *      into the request form. The answers have one shape and both ends read
 *      it.
 *
 * And one that would be worse than either: asking a family planning a week on
 * a beach which kevarim they want to visit.
 */

const FLOW = readFileSync("components/TripStartFlow.tsx", "utf8");
const FORM = readFileSync("components/PlanningRequestForm.tsx", "utf8");

function answers(over: Partial<TripPlanAnswers> = {}): TripPlanAnswers {
  return { ...emptyAnswers(), ...over };
}

describe("what is asked", () => {
  it("offers the seven kinds of trip that were asked for", () => {
    assert.deepEqual(
      TRIP_KINDS.map((kind) => kind.value),
      ["relaxing", "city-break", "family", "honeymoon", "group", "heritage", "unsure"],
    );
  });

  it("ENDS WITH “NOT SURE YET”, as a real answer", () => {
    // Somebody who does not know what kind of trip they want is not a broken
    // form submission. They are the person this exists for.
    const last = TRIP_KINDS[TRIP_KINDS.length - 1];
    assert.equal(last.value, "unsure");
    assert.match(last.blurb, /normal|help/i);
  });

  it("offers “I don’t know yet” in every list where it could be true", () => {
    assert.ok(KOSHER_REQUIREMENTS.some((option) => /don’t know/i.test(option)));
    assert.ok(SHABBOS_REQUIREMENTS.some((option) => /don’t know/i.test(option)));
  });

  it("describes kosher requirements as standards rather than a strictness slider", () => {
    // A family that keeps cholov yisroel is not "stricter" on a scale — they
    // need a different shop.
    assert.ok(KOSHER_REQUIREMENTS.some((option) => /cholov yisroel/i.test(option)));
    assert.ok(KOSHER_REQUIREMENTS.some((option) => /glatt|beis yosef/i.test(option)));
    for (const option of KOSHER_REQUIREMENTS) assert.doesNotMatch(option, /strict|lenient|level \d/i, option);
  });

  it("asks the Shabbos questions that actually decide a trip", () => {
    const all = SHABBOS_REQUIREMENTS.join(" ").toLowerCase();
    for (const needed of ["minyan", "eruv", "meals", "mikvah"]) assert.match(all, new RegExp(needed), needed);
  });

  it("has three steps and the third is the one that changes what happens", () => {
    assert.equal(STEPS.length, 3);
    assert.deepEqual(STEPS.map((s) => s.id), ["kind", "shape", "how"]);
    assert.match(STEPS[2].title, /how would you like to plan it/i);
  });

  it("keeps interests short enough to read", () => {
    assert.ok(INTERESTS.length >= 6 && INTERESTS.length <= 12, `${INTERESTS.length} interests`);
  });
});

describe("nothing is required", () => {
  it("summarises an empty set of answers without inventing anything", () => {
    assert.deepEqual(summarize(emptyAnswers()), []);
    assert.equal(hasAnswers(emptyAnswers()), false);
  });

  it("treats “help me choose” as an answer, not a blank", () => {
    const said = summarize(answers({ helpMeChoose: true }));
    assert.deepEqual(said, [["Destination", "Help me choose"]]);
    assert.equal(hasAnswers(answers({ helpMeChoose: true })), true);
  });

  it("tells the difference between “I don’t know” and never asked", () => {
    // Saying the dates are open is a decision worth passing on. An untouched
    // question is not — printing "Dates: not decided yet" for somebody who
    // never reached that part of the form puts words in their mouth.
    assert.deepEqual(summarize(answers({ dateMode: "unknown" })), [["Dates", "Not decided yet"]]);
    assert.deepEqual(summarize(answers({ dateMode: "" })), []);
  });

  it("counts answered questions rather than completed steps", () => {
    // Step two is nine questions long; a bar stuck on "1 of 3" while somebody
    // fills in eight fields tells them nothing.
    const empty = progressOf(emptyAnswers());
    assert.equal(empty.answered, 0);
    assert.ok(empty.total >= 8);
    const some = progressOf(answers({ kind: "family", destination: "Rome", from: "New York", adults: "2" }));
    assert.equal(some.answered, 4);
    assert.ok(some.percent > 0 && some.percent < 100);
  });
});

describe("the kevarim question", () => {
  it("IS NEVER ASKED OF A BEACH HOLIDAY", () => {
    // THE ONE THAT MATTERS. The old contact form asked everybody for "your
    // kevarim, dates, and kosher needs", which told a vacation customer in one
    // line that the site was not for them.
    const beach = answers({ kind: "relaxing", destination: "Nice", kevarim: "should never appear" });
    const said = summarize({ ...beach, kevarim: "" });
    assert.ok(!said.some(([term]) => /kever|kevarim/i.test(term)), JSON.stringify(said));
    assert.doesNotMatch(requestMessage({ ...beach, kevarim: "" }), /kevarim/i);
  });

  it("is asked, and carried, for a heritage journey", () => {
    const heritage = answers({ kind: "heritage", kevarim: "Lizhensk and Sanz" });
    assert.ok(summarize(heritage).some(([term, value]) => /kevarim/i.test(term) && value.includes("Lizhensk")));
  });

  it("is shown by the flow and the form only for the heritage kind", () => {
    // Read from the source, because the condition is the whole feature.
    assert.match(FLOW, /answers\.kind === "heritage"/);
    assert.match(FORM, /kind === "heritage"/);
    // And the value is dropped rather than merely hidden, so a kind changed
    // after typing cannot smuggle the answer through.
    assert.match(FORM, /kind === "heritage" \? text\("kevarim"\) : ""/);
  });
});

describe("nobody types anything twice", () => {
  const full = answers({
    kind: "family",
    destination: "Rome",
    dateMode: "exact",
    startDate: "2026-07-05",
    endDate: "2026-07-12",
    from: "New York",
    adults: "2",
    children: "3",
    childAges: "4, 7 and 11",
    pace: "balanced",
    interests: ["Food", "Things for children"],
    kosher: ["Cholov Yisroel"],
    shabbos: ["Walking distance to a minyan"],
    notes: "One of us cannot walk far.",
  });

  it("carries every answer into the message the request sends", () => {
    const message = requestMessage(full);
    for (const needle of ["Rome", "2026-07-05", "New York", "2 adults, 3 children (ages 4, 7 and 11)", "Cholov Yisroel", "cannot walk far"]) {
      assert.ok(message.includes(needle), `${needle} did not survive into the request`);
    }
  });

  it("titles the request so an inbox can tell one from another", () => {
    assert.equal(requestSubject(full), "Family trip — Rome");
    // "Destination undecided" in the subject, because that is the request the
    // owner most wants to spot in a list: somebody who needs help choosing.
    assert.equal(requestSubject(answers({ kind: "relaxing", helpMeChoose: true })), "Relaxing vacation — destination undecided");
    assert.equal(requestSubject(emptyAnswers()), "Trip");
  });

  it("stays well inside what the contact endpoint accepts", () => {
    // /api/contact caps a message at 4,000 characters.
    const stuffed = answers({
      ...full,
      notes: "x".repeat(5000),
      kosherNotes: "y".repeat(5000),
    });
    assert.ok(requestMessage(stuffed).length <= 3800);
  });

  it("seeds the planner with what the planner has fields for", () => {
    const seed = plannerSeed(full);
    assert.equal(seed.title, "Rome trip");
    assert.equal(seed.startDate, "2026-07-05");
    assert.equal(seed.endDate, "2026-07-12");
    assert.equal(seed.travelers.filter((t) => t.kind === "adult").length, 2);
    assert.equal(seed.travelers.filter((t) => t.kind === "child").length, 3);
  });

  it("DOES NOT GUESS A DATE FROM “roughly July”", () => {
    // Turning "July" into the 1st would put a date in the trip that the
    // traveler never chose and that looks like their own answer.
    const rough = answers({ dateMode: "approximate", approximateWhen: "July", destination: "Rome" });
    const seed = plannerSeed(rough);
    assert.equal(seed.startDate, "");
    assert.equal(seed.endDate, "");
    assert.match(seed.notes, /July/, "the rough answer was dropped instead of being carried into the notes");
  });

  it("carries everything the planner has no field for into its notes", () => {
    const seed = plannerSeed(full);
    for (const needle of ["Cholov Yisroel", "Walking distance to a minyan", "cannot walk far"]) {
      assert.ok(seed.notes.includes(needle), needle);
    }
  });

  it("names an untitled trip after something, never “undefined”", () => {
    assert.equal(plannerSeed(emptyAnswers()).title, "My trip");
    assert.equal(plannerSeed(answers({ kind: "honeymoon" })).title, "Honeymoon");
  });
});

describe("what was stored", () => {
  it("reads back what was written", () => {
    const stored = JSON.stringify(answers({ kind: "city-break", destination: "Prague", adults: "2" }));
    const back = readAnswers(stored);
    assert.equal(back?.kind, "city-break");
    assert.equal(back?.destination, "Prague");
  });

  it("throws away anything that is not the shape it expects", () => {
    // Another tab, an extension, or an older version of this code put it
    // there. Same rule as lib/drafts.ts.
    assert.equal(readAnswers(null), null);
    assert.equal(readAnswers("not json"), null);
    assert.equal(readAnswers(JSON.stringify({ kind: "nonsense" }))?.kind, "");
    assert.equal(readAnswers(JSON.stringify({ startDate: "sometime" }))?.startDate, "");
    assert.deepEqual(readAnswers(JSON.stringify({ interests: [1, 2, "Food"] }))?.interests, ["Food"]);
  });

  it("keeps one key, and both ends read it", () => {
    assert.equal(TRIP_PLAN_KEY, "whiteGloveTripPlan");
    assert.match(FLOW, /TRIP_PLAN_KEY/);
    assert.match(FORM, /TRIP_PLAN_KEY/);
  });
});

describe("where step three goes", () => {
  it("opens the planner for somebody planning it themselves", () => {
    assert.equal(nextStepHref(answers({ method: "myself" })), "/itinerary?from=plan");
  });

  it("opens the request form for somebody who wants us to", () => {
    assert.equal(nextStepHref(answers({ method: "white-glove" })), "/contact?from=plan");
  });

  it("shows destinations to somebody who has not decided", () => {
    assert.equal(nextStepHref(emptyAnswers()), "/vacation-ideas");
  });
});

describe("what we suggest afterwards", () => {
  it("maps a trip kind onto a vacation category where there is one", () => {
    assert.equal(suggestedTheme(answers({ kind: "relaxing" })), "beach");
    assert.equal(suggestedTheme(answers({ kind: "honeymoon" })), "couples");
  });

  it("SUGGESTS NOTHING for a heritage journey or a group trip", () => {
    // Showing a page of beaches to somebody planning a kevarim route is worse
    // than showing nothing.
    assert.equal(suggestedTheme(answers({ kind: "heritage" })), null);
    assert.equal(suggestedTheme(answers({ kind: "group" })), null);
    assert.equal(suggestedTheme(emptyAnswers()), null);
  });

  it("knows every kind by value", () => {
    for (const kind of TRIP_KINDS) assert.equal(tripKind(kind.value)?.label, kind.label);
    assert.equal(tripKind("nonsense"), undefined);
  });
});

describe("the flow and the form behave themselves", () => {
  it("blocks nothing: no required field in the flow at all", () => {
    // A single `required` in the wizard would stop the person it exists for.
    assert.doesNotMatch(FLOW, /\brequired\b/);
  });

  it("moves the focus with the step", () => {
    // Pressing Next and leaving the focus on a button that no longer exists
    // strands a keyboard user at the top of the document.
    assert.match(FLOW, /headingRef\.current\?\.focus\(\)/);
    assert.match(FLOW, /tabIndex=\{-1\}/);
  });

  it("marks the current step for a screen reader", () => {
    assert.match(FLOW, /aria-current=\{.*"step"/);
  });

  it("gives the request form an error summary that links to the fields", () => {
    assert.match(FORM, /role="alert"/);
    assert.match(FORM, /href=\{`#\$\{problem\.field\}`\}/);
    assert.match(FORM, /aria-invalid/);
    assert.match(FORM, /aria-describedby/);
  });

  it("MAKES TWO FIELDS MANDATORY AND NO MORE", () => {
    // A name and somewhere to write back. Everything else about the trip is
    // optional, because the person this is for may not know it yet — and a
    // third `required` attribute appearing here is how that stops being true.
    const attributes = FORM.match(/^\s*required$/gm) ?? [];
    assert.equal(attributes.length, 2, `${attributes.length} required fields — something else became mandatory`);
  });
});
