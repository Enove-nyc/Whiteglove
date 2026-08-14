import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MAX_TRIP_CLIENT } from "@/lib/account-store";

/**
 * The two things a Business account does in the planner: say who a trip is
 * for, and send the finished thing to them.
 *
 * BOTH ARE GATED ON THE SERVER, AND THAT IS WHAT MOST OF THIS FILE CHECKS. The
 * panel not being drawn is a courtesy; the route is the door. The send route in
 * particular emails an address somebody typed in, which is the shape of every
 * spam relay ever built, so the fences around it are worth more than the
 * feature and are pinned down here.
 *
 * These read the source rather than calling the routes: the routes need cookies
 * and Redis, and what is being asserted is that the checks are PRESENT and come
 * before the work — which is a property of the code, not of one response.
 */

const TRIPS_ROUTE = readFileSync("app/api/account/trips/route.ts", "utf8");
const SEND_ROUTE = readFileSync("app/api/account/itinerary/send/route.ts", "utf8");

describe("saying who a trip is for", () => {
  it("checks the plan on the server, not just in the panel", () => {
    const branch = TRIPS_ROUTE.slice(TRIPS_ROUTE.indexOf('case "client"'), TRIPS_ROUTE.indexOf('case "duplicate"'));
    assert.match(branch, /mayBrandOwnItinerary/);
    assert.match(branch, /403/);
    // And the refusal is before the write, not after it.
    assert.ok(branch.indexOf("mayBrandOwnItinerary") < branch.indexOf("setTripClient"));
  });

  it("keeps the name short enough to sit on a cover", () => {
    assert.ok(MAX_TRIP_CLIENT > 0 && MAX_TRIP_CLIENT <= 80);
  });

  it("SHOWS THE NAME ONLY ON A BRANDED DOCUMENT", () => {
    // "Prepared for <your own name>" on a traveller's own printout would be
    // strange. The line means something because a business is handing it to
    // somebody else, so the component checks for a brand rather than trusting
    // each caller to remember.
    const print = readFileSync("components/PrintableItinerary.tsx", "utf8");
    assert.match(print, /brand && preparedFor\.trim\(\)/);
  });
});

describe("sending an itinerary to a client", () => {
  it("is Business only, and says so before anything else happens", () => {
    assert.match(SEND_ROUTE, /mayBrandOwnItinerary/);
    assert.ok(SEND_ROUTE.indexOf("mayBrandOwnItinerary") < SEND_ROUTE.indexOf("sendItineraryToClient"));
  });

  it("REFUSES A CROSS-SITE REQUEST", () => {
    assert.match(SEND_ROUTE, /sameOrigin/);
    // First thing in the handler, before the account is even read.
    const body = SEND_ROUTE.slice(SEND_ROUTE.indexOf("export async function POST"));
    assert.ok(body.indexOf("sameOrigin") < body.indexOf("getCurrentAccountData"));
  });

  it("IS RATE LIMITED, so it cannot be used as a relay", () => {
    // Compared inside the handler, not against the import list at the top.
    const body = SEND_ROUTE.slice(SEND_ROUTE.indexOf("export async function POST"));
    assert.match(body, /await rateLimit\(/);
    assert.ok(body.indexOf("await rateLimit(") < body.indexOf("await sendItineraryToClient("));
  });

  it("TAKES NO URL FROM THE REQUEST", () => {
    // The only link it can send is this account's own share link for their own
    // trip. If a url could be passed in, this would be an open redirector with
    // a mail server attached.
    const parsed = SEND_ROUTE.slice(SEND_ROUTE.indexOf("const body ="), SEND_ROUTE.indexOf("const limited"));
    assert.ok(!/url/i.test(parsed), "the request body can carry a url");
    assert.match(SEND_ROUTE, /ensureItineraryShare/);
  });

  it("needs a business name, so nothing goes out signed by nobody", () => {
    assert.match(SEND_ROUTE, /printBrandFor/);
    assert.match(SEND_ROUTE, /409/);
  });

  it("checks the address is an address", () => {
    assert.match(SEND_ROUTE, /\/\^\[\^\\s@\]\+@/);
  });
});

describe("what the client's email says", () => {
  const email = readFileSync("lib/email.ts", "utf8");
  const fn = email.slice(email.indexOf("export async function sendItineraryToClient"));

  it("goes out as the business, and replies come back to them", () => {
    // The client has never heard of White Glove. An email from a stranger
    // about their holiday is an email they delete.
    assert.match(fn, /reply_to/);
    assert.match(fn, /input\.from/);
  });

  it("keeps the credit line, like the document does", () => {
    assert.match(fn, /whitegloveitineraries\.com/);
  });

  it("escapes everything the agent typed", () => {
    // The note is free text written by one account and read by somebody else.
    assert.match(fn, /escapeHtml\(note\)/);
    assert.match(fn, /escapeHtml\(input\.from\)/);
  });
});

describe("what Business is said to be for", () => {
  it("describes planning for other people, not being in the directory", () => {
    const plans = readFileSync("lib/account-plans.ts", "utf8");
    // PLAN_LABELS holds a `business:` line too, and it comes first — so the
    // blurb is read from inside PLAN_BLURB rather than from the first match.
    const table = plans.slice(plans.indexOf("PLAN_BLURB"));
    const blurb = /business: "([^"]+)"/.exec(table)?.[1] ?? "";
    assert.match(blurb, /plans? trips for other people|agency/i);
  });
});
