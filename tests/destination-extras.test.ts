import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kosherAreas } from "@/data/kosher-stays";
import { vacationDestinations } from "@/data/vacation-destinations";
import { shownToVisitors } from "@/lib/travel-extras";

/**
 * The eSIM, the policy and the transfer, on the page where the trip is real.
 *
 * WHY HERE AND NOT ONLY ON /book. Somebody who has read what Shabbos looks
 * like in Rome and what there is to eat has a trip in their head and nothing
 * arranged. That is when a data plan or a policy is worth a thought. On /book
 * the same row sits under a flight search, where the reader has just picked
 * dates — the words above it differ for that reason and nothing else does.
 *
 * IT RECOMMENDS NOTHING, and that is the rule the row was built with: the
 * owner writes the name, the line and the link, and the site adds no opinion
 * about which policy anybody should buy. Travel insurance especially is not
 * something a travel website should be advising on.
 *
 * IT RENDERS NOTHING UNTIL THERE IS SOMETHING. No configured extras means no
 * section — not an empty heading, and not a placeholder.
 */

const PAGE = readFileSync("app/destinations/[destination]/page.tsx", "utf8");
const EXTRAS = readFileSync("components/TravelExtras.tsx", "utf8");

describe("the extras on a destination page", () => {
  it("READS THE OWNER'S LIST, and shares the round trip with the booking link", () => {
    assert.match(PAGE, /readExtras\(\)/);
    assert.match(PAGE, /Promise\.all\(\[readBookingLink\(\), readExtras\(\)\]\)/);
  });

  it("SITS AFTER THE PRACTICAL SECTIONS, before the booking block", () => {
    // In front of them it would be a row of adverts ahead of the thing
    // somebody came for.
    const shabbos = PAGE.indexOf('id="shabbos"');
    const extras = PAGE.indexOf("<TravelExtras");
    const booking = PAGE.indexOf("Ready to book {destination.name}?");
    assert.ok(shabbos > 0 && extras > 0 && booking > 0);
    assert.ok(shabbos < extras, "the extras come before the Shabbos section");
    assert.ok(extras < booking, "the extras come after the booking block");
  });

  it("says something true about where it is", () => {
    // "Once the flights are booked" is right on /book and wrong here, where
    // nothing has been booked at all.
    assert.match(PAGE, /heading=\{`Before you go to \$\{destination\.name\}`\}/);
    assert.match(EXTRAS, /heading = "Once the flights are booked"/);
  });

  it("RENDERS NOTHING WHEN THE OWNER HAS ADDED NOTHING", () => {
    assert.equal(shownToVisitors([]).length, 0);
    assert.match(EXTRAS, /if \(shown\.length === 0\) return null;/);
  });

  it("RECOMMENDS NONE OF THEM", () => {
    const prose = EXTRAS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const pattern of [/\bwe recommend\b/i, /\bbest\b/i, /\brecommended\b/i, /you should buy/i]) {
      assert.doesNotMatch(prose, pattern, "the extras row is giving advice");
    }
  });
});

describe("the quarter chooser has nothing to choose between", () => {
  it("RECORDS WHY IT WAS NOT BUILT", () => {
    // The pivot plan lists a "Where should I stay?" tool for /hotels. Every
    // destination on the site resolves to at most ONE Jewish quarter, so a
    // tool for comparing them would be a chooser with one option — a feature
    // built on data that does not exist yet, which is the one thing this
    // codebase refuses to do.
    //
    // This assertion is the record. When a destination gains a second quarter
    // it fails, and the chooser becomes worth building that day.
    const multi = vacationDestinations
      .map((destination) => ({
        slug: destination.slug,
        quarters: kosherAreas.filter((area) => destination.cities.includes(area.city)).length,
      }))
      .filter((entry) => entry.quarters > 1);
    assert.deepEqual(
      multi,
      [],
      `these destinations now hold more than one quarter, so the chooser is worth building: ${multi
        .map((entry) => `${entry.slug} (${entry.quarters})`)
        .join(", ")}`,
    );
  });

  it("still names the one quarter where there is one", () => {
    // Not building the chooser must not mean dropping the answer. Every
    // destination that has a quarter still shows it.
    assert.match(PAGE, /Which part of town/);
    const withQuarter = vacationDestinations.filter((destination) =>
      kosherAreas.some((area) => destination.cities.includes(area.city)),
    );
    assert.ok(withQuarter.length > 10, `only ${withQuarter.length} destinations name a quarter`);
  });
});
