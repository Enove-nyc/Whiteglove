import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { featuresFor, mayServeCompanionClients, mayUseCompanionApp, PLAN_FEATURES } from "@/lib/account-limits";
import { whatYouGet } from "@/lib/account-plans";

/**
 * Where the White Glove app's line falls between the plans.
 *
 * IT IS TWO ENTITLEMENTS, NOT ONE, and that is the whole of this file. Gold and
 * Business both get the app for their OWN trips — that is companionApp, the step
 * up from a free account. Only Business hands the app to somebody else — a
 * client link, the chat, the inbox — and that is companionClients. A change that
 * let Gold hand a trip to a client, or that shut Gold out of its own app, trips
 * a test here rather than shipping.
 *
 * The gates are read the way business-trips.test.ts reads them: from the source,
 * because what matters is that the check is PRESENT and is the right one, which
 * is a property of the code and not of one response that would need cookies and
 * Redis to produce.
 */

describe("who gets the app for their own trips", () => {
  it("is Gold and Business, never a free account", () => {
    assert.equal(mayUseCompanionApp("pro"), true);
    assert.equal(mayUseCompanionApp("business"), true);
    assert.equal(mayUseCompanionApp("traveler"), false);
  });
});

describe("who may hand the app to a client", () => {
  it("is Business, and only Business", () => {
    // Gold has the app for itself; it has no clients to serve. The client link,
    // the chat and the inbox are the "planning on somebody else's behalf" that
    // Business is for.
    assert.equal(mayServeCompanionClients("business"), true);
    assert.equal(mayServeCompanionClients("pro"), false);
    assert.equal(mayServeCompanionClients("traveler"), false);
  });

  it("KEEPS THE TWO HALVES SEPARATE IN THE TABLE", () => {
    // If these ever collapse back into one flag, Gold either loses its own app
    // or gains a client inbox it was never meant to have.
    assert.equal(PLAN_FEATURES.pro.companionApp, true);
    assert.equal(PLAN_FEATURES.pro.companionClients, false);
    assert.equal(PLAN_FEATURES.business.companionApp, true);
    assert.equal(PLAN_FEATURES.business.companionClients, true);
    assert.equal(PLAN_FEATURES.traveler.companionApp, false);
    assert.equal(PLAN_FEATURES.traveler.companionClients, false);
    assert.equal(featuresFor("pro").companionClients, false);
  });
});

describe("the words on the account page line up with the gates", () => {
  it("promises Gold the app for its own trips, and never a client one", () => {
    // The line a Gold member reads is about their OWN trip on their OWN phone.
    // It must not promise anything client-facing, because the gate refuses it.
    const gold = whatYouGet("pro");
    assert.ok(gold.some((line) => /app for your own trips/i.test(line)), "Gold is not promised its own app");
    assert.ok(!gold.some((line) => /client|travellers you plan for/i.test(line)), "Gold is promised a client feature it cannot use");
  });

  it("promises Business the app it hands to the people it plans for", () => {
    const business = whatYouGet("business");
    assert.ok(business.some((line) => /travellers you plan for|opens their trip|chat with each/i.test(line)), "Business is not promised the client app");
  });
});

describe("the gates in the pages and routes are the right ones", () => {
  it("lets Gold in the door at /app, on mayUseCompanionApp", () => {
    const page = readFileSync("app/app/page.tsx", "utf8");
    assert.match(page, /mayUseCompanionApp\(plan\)/);
    // The inbox tab is only handed on to somebody who serves clients.
    assert.match(page, /mayServeCompanionClients\(plan\)/);
    assert.match(page, /advisorInbox=\{servesClients\}/);
  });

  it("opens a client's shared link only for a Business owner", () => {
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
