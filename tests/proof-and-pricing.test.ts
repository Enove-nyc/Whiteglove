import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { attractions } from "@/data/attractions";
import { buildDays, formatDateLong, travelersOf } from "@/data/itinerary";
import { buildPrintTimeline } from "@/data/itinerary-print";
import { kosherAreas } from "@/data/kosher-stays";
import { SAMPLE_ITINERARY, SAMPLE_NOTICE, WHAT_IS_IN_IT } from "@/data/sample-itinerary";
import { services } from "@/data/services";
import { BUILT_IN_WORDS, PRICE_NOT_PUBLISHED } from "@/data/site-words";
import { FIELDS } from "@/lib/site-words";
import { publicPaths } from "@/lib/site-map";

/**
 * Two gaps a visitor could feel and not name.
 *
 * PRICE. Every service said "quoted once we understand the trip" and stopped.
 * True, and also exactly what a site with something to hide says; a person
 * deciding whether to write in cannot tell the two apart.
 *
 * PROOF. The services page explains the process well and never shows the thing
 * at the end of it. "A written day-by-day itinerary" is a description of a
 * deliverable, and the decision being made is about the deliverable.
 *
 * What these tests protect is the way both were answered: by saying what is
 * true and marking what is not known, rather than by filling either gap with
 * something plausible. A made-up starting price or an invented testimonial
 * would fix the symptom and cost the site the only argument it has.
 */

const PRICING = readFileSync("components/ServicePricing.tsx", "utf8");
const SAMPLE_PAGE = readFileSync("app/sample-itinerary/page.tsx", "utf8");
const SAMPLE_DATA = readFileSync("data/sample-itinerary.ts", "utf8");

describe("what to expect about price", () => {
  it("ANSWERS ALL SIX QUESTIONS, or says which it cannot", () => {
    for (const key of [
      "pricingStartsAt",
      "pricingWhatAffects",
      "pricingTurnaround",
      "pricingRevisions",
      "pricingBookingSupport",
      "pricingFeeCredit",
    ] as const) {
      assert.ok(BUILT_IN_WORDS[key].trim().length > 20, `${key} is blank`);
      assert.ok(
        FIELDS.some((field) => field.key === key),
        `${key} cannot be answered from the admin, so it can never stop saying "not published yet"`,
      );
    }
  });

  it("INVENTS NO FIGURE, NO TURNAROUND AND NO CREDIT POLICY", () => {
    // The three the site does not know. Each says so in as many words rather
    // than being left blank or filled with something plausible.
    assert.equal(BUILT_IN_WORDS.pricingStartsAt, PRICE_NOT_PUBLISHED);
    assert.equal(BUILT_IN_WORDS.pricingTurnaround, PRICE_NOT_PUBLISHED);
    assert.equal(BUILT_IN_WORDS.pricingFeeCredit, PRICE_NOT_PUBLISHED);
    for (const key of ["pricingStartsAt", "pricingWhatAffects", "pricingTurnaround", "pricingRevisions", "pricingBookingSupport", "pricingFeeCredit"] as const) {
      assert.doesNotMatch(BUILT_IN_WORDS[key], /[€$£]\s?\d/, `${key} quotes a price`);
      assert.doesNotMatch(BUILT_IN_WORDS[key], /\b\d+\s*(hours?|days?|business days?)\b/i, `${key} promises a turnaround`);
    }
  });

  it("answers the three the site already stands behind", () => {
    // Each of these is asserted elsewhere on the site, which is why it can be
    // asserted here: revisions from the vacation-planning process, the
    // commission arrangement from the flights service.
    assert.notEqual(BUILT_IN_WORDS.pricingRevisions, PRICE_NOT_PUBLISHED);
    assert.match(BUILT_IN_WORDS.pricingRevisions, /adjust|change/i);
    assert.notEqual(BUILT_IN_WORDS.pricingBookingSupport, PRICE_NOT_PUBLISHED);
    assert.match(BUILT_IN_WORDS.pricingBookingSupport, /commission/i);
    assert.notEqual(BUILT_IN_WORDS.pricingWhatAffects, PRICE_NOT_PUBLISHED);
  });

  it("MARKS AN UNANSWERED LINE, so it cannot be read as an answer", () => {
    assert.match(PRICING, /PRICE_NOT_PUBLISHED/);
    assert.match(PRICING, /Not published yet/);
    // A word rather than a colour, since this is the one distinction on the
    // panel that changes what the sentence means.
    assert.match(PRICING, /const unanswered = answer === PRICE_NOT_PUBLISHED/);
  });

  it("no longer leaves a service's price line as “quoted” and nothing else", () => {
    const planning = services.find((service) => service.id === "vacation-planning");
    assert.ok(planning);
    assert.match(planning.pricing, /before any work starts/i);
    assert.match(planning.pricing, /what to expect about price/i);
    for (const service of services) assert.doesNotMatch(service.pricing, /[€$£]\s?\d/, service.id);
  });
});

describe("the sample itinerary", () => {
  it("IS BUILT BY THE PLANNER, not drawn as a mock-up", () => {
    // If the printed itinerary changes, the sample changes with it. That is
    // the only way a sample stays true to what is delivered.
    assert.match(SAMPLE_PAGE, /<PrintableItinerary itin=\{SAMPLE_ITINERARY\}/);
    // Embedded, so the document's headings nest under the page's rather than
    // giving it a second h1.
    assert.match(SAMPLE_PAGE, /embedded/);
    const days = buildDays(SAMPLE_ITINERARY, undefined);
    assert.equal(days.length, 8);
    assert.ok(days.every((day) => buildPrintTimeline(day, {}).length > 0), "a day in the sample renders empty");
  });

  it("NAMES ONLY PLACES THE SITE ALREADY PUBLISHES", () => {
    // Every place on it is a record with a source behind it. A stop invented
    // for the sample would be the one line on the document that was not true
    // of anywhere.
    const known = new Set<string>([
      ...attractions.filter((entry) => entry.city === "Rome").map((entry) => entry.name),
      ...kosherAreas.filter((entry) => entry.city === "Rome").map((entry) => entry.name),
    ]);
    const placed = SAMPLE_ITINERARY.activities.filter((activity) => activity.coordinates);
    assert.ok(placed.length >= 5);
    for (const activity of placed) {
      const matchesRecord =
        known.has(activity.name) ||
        // The Ghetto quarter, referred to by its street rather than by the
        // full record name. Same coordinate, which is what is checked.
        kosherAreas.some((area) => area.city === "Rome" && area.coordinates === activity.coordinates) ||
        attractions.some((entry) => entry.city === "Rome" && entry.coordinates === activity.coordinates);
      assert.ok(matchesRecord, `${activity.name} is not a record this site holds`);
    }
  });

  it("NAMES NO HOTEL, NO AIRLINE AND NO CONFIRMATION", () => {
    // Each of those would be a claim about something that has not happened.
    for (const flight of SAMPLE_ITINERARY.flights) {
      assert.equal(flight.airline, undefined, "the sample names an airline");
      assert.equal(flight.flightNo, undefined, "the sample invents a flight number");
      assert.equal(flight.confirmation, undefined, "the sample invents a booking reference");
    }
    for (const stay of SAMPLE_ITINERARY.lodging) {
      assert.equal(stay.confirmation, undefined);
      assert.match(stay.name, /^A hotel/, "the sample names a specific property");
    }
    assert.doesNotMatch(SAMPLE_DATA, /[€$£]\s?\d/, "the sample quotes a price");
  });

  it("SAYS IT IS A SAMPLE, on the page and in the data", () => {
    assert.match(SAMPLE_NOTICE, /sample, not a booking/i);
    assert.match(SAMPLE_PAGE, /SAMPLE_NOTICE/);
    assert.match(SAMPLE_PAGE, /not a picture of one/i);
  });

  it("shows the parts an ordinary itinerary gets wrong", () => {
    const dates = SAMPLE_ITINERARY.activities.map((activity) => activity.date);
    // A Friday that stops early, a Shabbos with nothing timed on it, and a day
    // with nothing planned. Those three are the reason this sample exists.
    const shabbos = SAMPLE_ITINERARY.activities.find((activity) => activity.date === "2026-10-31");
    assert.ok(shabbos, "the sample has no Shabbos on it");
    assert.equal(shabbos.startTime, undefined, "the Shabbos entry carries a time");
    assert.ok(dates.includes("2026-10-30"), "no erev Shabbos");
    assert.ok(
      SAMPLE_ITINERARY.activities.some((activity) => /unplanned/i.test(activity.name)),
      "every day on the sample is full",
    );
    // The Friday really is a Friday.
    assert.match(formatDateLong("2026-10-30"), /^Friday/);
    assert.match(formatDateLong("2026-10-31"), /^Saturday/);
  });

  it("is a real family rather than one traveler", () => {
    const travelers = travelersOf(SAMPLE_ITINERARY);
    assert.equal(travelers.length, 5);
    assert.equal(travelers.filter((traveler) => traveler.kind === "child").length, 3);
    // No real names on a published document.
    for (const traveler of travelers) assert.match(traveler.name, /^(Adult|Child)$/);
  });

  it("INVENTS NO TESTIMONIAL to go with it", () => {
    const prose = SAMPLE_PAGE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(prose, /“[^”]{20,}”\s*—\s*[A-Z]/);
    // And it says out loud that there is not one, rather than being quietly
    // silent about it.
    assert.match(SAMPLE_PAGE, /No testimonial/);
  });

  it("says what is in it, and is reachable", () => {
    assert.ok(WHAT_IS_IN_IT.length >= 5);
    const paths = new Set(publicPaths().map((entry) => entry.path));
    assert.ok(paths.has("/sample-itinerary"), "the sample is not in the sitemap");
    const FOOTER = readFileSync("components/Footer.tsx", "utf8");
    const NAV = readFileSync("lib/navigation.ts", "utf8");
    const SERVICES = readFileSync("app/services/page.tsx", "utf8");
    for (const [file, source] of [["footer", FOOTER], ["menu", NAV], ["services", SERVICES]] as const) {
      assert.match(source, /\/sample-itinerary/, `no way to the sample from the ${file}`);
    }
  });
});
