import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { kosherAreas } from "@/data/kosher-stays";
import { vacationDestinations } from "@/data/vacation-destinations";
import { defaultTravelEssentials, essentialsForContext } from "@/lib/travel-essentials";
import { NO_STAY22 } from "@/lib/stay22";

/**
 * Travel Essentials on the page where the trip is real.
 *
 * Renders nothing until a service is enabled with a real hand-off. Does not
 * recommend products; insurance wording stays comparative only.
 */

const PAGE = readFileSync("app/destinations/[destination]/page.tsx", "utf8");
const ESSENTIALS = readFileSync("components/TravelEssentials.tsx", "utf8");

describe("Travel Essentials on a destination page", () => {
  it("uses the Travel Essentials component after practical booking options", () => {
    assert.match(PAGE, /TravelEssentials/);
    assert.match(PAGE, /pageType="destination"/);
    const bookingOptions = PAGE.indexOf("<DestinationBookingOptions");
    const essentials = PAGE.indexOf("<TravelEssentials");
    const booking = PAGE.indexOf("Ready to book {destination.name}?");
    assert.ok(bookingOptions > 0 && essentials > 0 && booking > 0);
    assert.ok(bookingOptions < essentials, "essentials follow the booking-options block");
    assert.ok(essentials < booking, "essentials come before the final booking CTA");
  });

  it("says something true about where it is", () => {
    assert.match(PAGE, /heading=\{`Before you go to \$\{destination\.name\}`\}/);
  });

  it("RENDERS NOTHING WHEN NOTHING IS CONFIGURED", () => {
    const cards = essentialsForContext(defaultTravelEssentials(), { travelpayouts: {}, stay22: NO_STAY22 }, {
      pageType: "destination",
      destinationName: "Rome",
      destinationSlug: "rome",
      page: "/destinations/rome",
      placement: "destination-essentials",
    });
    assert.equal(cards.length, 0);
    assert.match(ESSENTIALS, /if \(cards\.length === 0\) return null;/);
  });

  it("RECOMMENDS NONE OF THEM", () => {
    const prose = ESSENTIALS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    for (const pattern of [/\bwe recommend\b/i, /\bbest\b/i, /\brecommended\b/i, /you should buy/i]) {
      assert.doesNotMatch(prose, pattern, "Travel Essentials is giving advice");
    }
  });
});

describe("the quarter chooser has nothing to choose between", () => {
  it("RECORDS WHY IT WAS NOT BUILT", () => {
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
    assert.match(PAGE, /Which part of town/);
    const withQuarter = vacationDestinations.filter((destination) =>
      kosherAreas.some((area) => destination.cities.includes(area.city)),
    );
    assert.ok(withQuarter.length > 10, `only ${withQuarter.length} destinations name a quarter`);
  });
});
