import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { featuresFor, mayServeCompanionClients, mayUseCompanionApp, PLAN_FEATURES } from "@/lib/account-limits";
import { whatYouGet } from "@/lib/account-plans";

/**
 * Where the White Glove app's line falls between the plans.
 *
 * IT IS TWO ENTITLEMENTS, NOT ONE, and that is the whole of this file. One
 * Trip, Advisor Starter and Advisor Pro all get the app for their OWN trips —
 * that is companionApp, the step up from an account with no plan yet. Only
 * Advisor Starter and Advisor Pro hand the app to somebody else — a client
 * link, the chat, the inbox — and that is companionClients, because One Trip
 * is for planning one trip for yourself, not for a client. A change that let
 * One Trip hand a trip to a client, or that shut Starter out of its own app,
 * trips a test here rather than shipping.
 *
 * The gates are read the way business-trips.test.ts reads them: from the source,
 * because what matters is that the check is PRESENT and is the right one, which
 * is a property of the code and not of one response that would need cookies and
 * Redis to produce.
 */

describe("who gets the app for their own trips", () => {
  it("is every paid plan, never an account with no plan yet", () => {
    assert.equal(mayUseCompanionApp("one_trip"), true);
    assert.equal(mayUseCompanionApp("starter"), true);
    assert.equal(mayUseCompanionApp("pro"), true);
    assert.equal(mayUseCompanionApp("free"), false);
  });
});

describe("who may hand the app to a client", () => {
  it("is Advisor Starter and Advisor Pro, never One Trip", () => {
    // One Trip has the app for the one trip it is; it has no clients to serve.
    // The client link, the chat and the inbox are the "planning on somebody
    // else's behalf" that Advisor Starter is for.
    assert.equal(mayServeCompanionClients("starter"), true);
    assert.equal(mayServeCompanionClients("pro"), true);
    assert.equal(mayServeCompanionClients("one_trip"), false);
    assert.equal(mayServeCompanionClients("free"), false);
  });

  it("KEEPS THE TWO HALVES SEPARATE IN THE TABLE", () => {
    // If these ever collapse back into one flag, One Trip either loses its own
    // app or gains a client inbox it was never meant to have.
    assert.equal(PLAN_FEATURES.one_trip.companionApp, true);
    assert.equal(PLAN_FEATURES.one_trip.companionClients, false);
    assert.equal(PLAN_FEATURES.starter.companionApp, true);
    assert.equal(PLAN_FEATURES.starter.companionClients, true);
    assert.equal(PLAN_FEATURES.free.companionApp, false);
    assert.equal(PLAN_FEATURES.free.companionClients, false);
    assert.equal(featuresFor("one_trip").companionClients, false);
  });
});

describe("the words on the account page line up with the gates", () => {
  it("promises One Trip the app for its own trip, and never a client one", () => {
    // The line a One Trip member reads is about their OWN trip on their OWN
    // phone. It must not promise anything client-facing, because the gate
    // refuses it.
    const oneTrip = whatYouGet("one_trip");
    assert.ok(oneTrip.some((line) => /White Glove app/i.test(line)), "One Trip is not promised its own app");
    assert.ok(!oneTrip.some((line) => /client|travellers you plan for/i.test(line)), "One Trip is promised a client feature it cannot use");
  });

  it("promises Advisor Starter the app it hands to the people it plans for", () => {
    const starter = whatYouGet("starter");
    assert.ok(
      starter.some((line) => /client|opens their trip|chat with each/i.test(line)),
      "Advisor Starter is not promised the client app",
    );
  });
});

describe("the gates in the pages and routes are the right ones", () => {
  it("lets a paid plan in the door at /app, on mayUseCompanionApp", () => {
    const page = readFileSync("app/app/page.tsx", "utf8");
    assert.match(page, /mayUseCompanionApp\(plan\)/);
    // The inbox tab is only handed on to somebody who serves clients.
    assert.match(page, /mayServeCompanionClients\(plan\)/);
    assert.match(page, /advisorInbox=\{servesClients\}/);
  });

  it("opens a client's shared link only for an advisor who serves clients", () => {
    const shared = readFileSync("app/i/[shareId]/app/page.tsx", "utf8");
    assert.match(shared, /mayServeCompanionClients\(plan\)/);
    assert.doesNotMatch(shared, /mayUseCompanionApp/);
  });

  it("gates the advisor inbox on serving clients, before it reads any thread", () => {
    const route = readFileSync("app/api/companion/chats/route.ts", "utf8");
    assert.match(route, /mayServeCompanionClients\(await getPlan/);
    const body = route.slice(route.indexOf("export async function GET"));
    assert.ok(body.indexOf("mayServeCompanionClients") < body.indexOf("readChat"), "the inbox is read before the plan is checked");
  });

  it("gates the client link on serving clients, before it is created", () => {
    const trips = readFileSync("app/api/account/trips/route.ts", "utf8");
    const branch = trips.slice(trips.indexOf('case "share"'), trips.indexOf('case "duplicate"'));
    assert.match(branch, /mayServeCompanionClients/);
    assert.match(branch, /403/);
    assert.ok(branch.indexOf("mayServeCompanionClients") < branch.indexOf("ensureTripShare"));
  });
});
