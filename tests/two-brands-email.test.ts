import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/site-brand-core";

/**
 * Two transactional emails named the kosher brand outright, reachable from
 * both brands:
 *
 *   - sendItineraryShareEmail ("you've been added to <trip> on White Glove
 *     Kosher Travel") fires whenever ANY traveler shares a trip with someone
 *     — including a traveler on whitegloveitineraries.com.
 *   - sendItineraryToClient ("Planned with whiteglovekoshertravel.com") is the
 *     Business-only "send the finished itinerary to my client" email, and a
 *     Business account is not restricted to one brand either.
 *
 * Both now take a siteBrand and credit whichever site the account actually
 * sent from — never always the kosher one. The sandbox fallback sender
 * (TEST_SENDER, used for every kind of email from both brands whenever
 * RESEND_FROM_EMAIL isn't configured) is also no longer kosher-branded.
 */

const EMAIL = readFileSync("lib/email.ts", "utf8");

describe("the sandbox fallback sender names neither brand outright", () => {
  it("no longer says Kosher Travel", () => {
    assert.doesNotMatch(EMAIL, /const TEST_SENDER = "White Glove Kosher Travel/);
    assert.match(EMAIL, /const TEST_SENDER = "White Glove <onboarding@resend\.dev>"/);
  });
});

describe("sendItineraryShareEmail names whichever site the trip was shared from", () => {
  it("takes a siteBrand, defaulted to kosher", () => {
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendItineraryShareEmail"), EMAIL.indexOf("export async function sendTripNoteEmail"));
    assert.match(fn, /siteBrand\?: SiteBrand/);
    assert.match(fn, /BRAND_NAME\[opts\.siteBrand \?\? "kosher"\]/);
    assert.doesNotMatch(fn, /on White Glove Kosher Travel/);
  });
});

describe("sendItineraryToClient credits whichever site the account is on", () => {
  it("takes a siteBrand, defaulted to kosher, and uses it for the credit line", () => {
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendItineraryToClient"));
    assert.match(fn, /siteBrand\?: SiteBrand/);
    assert.match(fn, /BRAND_DOMAIN\[input\.siteBrand \?\? "kosher"\]/);
    assert.doesNotMatch(fn, /Planned with whiteglovekoshertravel\.com/);
  });
});

describe("the two callers pass the account's actual brand", () => {
  it("sharing a trip resolves the brand from the request", () => {
    const route = readFileSync("app/api/account/itinerary/collaborators/route.ts", "utf8");
    assert.match(route, /siteBrand: await currentBrand\(\)/);
  });

  it("sending to a client resolves the brand from the request", () => {
    const route = readFileSync("app/api/account/itinerary/send/route.ts", "utf8");
    assert.match(route, /siteBrand: await currentBrand\(\)/);
  });
});

describe("the brand tables agree with the print document's own fix", () => {
  it("name and domain are the same tables PrintableItinerary uses", () => {
    assert.equal(BRAND_NAME.itineraries, "White Glove Itineraries");
    assert.equal(BRAND_DOMAIN.itineraries, "whitegloveitineraries.com");
  });
});
