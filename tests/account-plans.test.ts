import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_PLANS,
  DEFAULT_PLAN,
  MAX_NOTE,
  type PlanRequest,
  PLAN_LABELS,
  describePlan,
  isAccountPlan,
  isUpgrade,
  planOf,
  plansToAskAbout,
  requestProblem,
  waitingFor,
  whatYouGet,
} from "@/lib/account-plans";

/**
 * What kind of account somebody has.
 *
 * The rule underneath all of these: a plan never decides what anybody can do.
 * Nothing is behind one yet, nothing is charged for one, and the tests say so
 * out loud — so that wiring a gate to a plan trips a failing test rather than
 * quietly taking something away from a traveller who had it yesterday.
 */

const NOW = "2026-08-02T14:00:00.000Z";
const agoHours = (h: number) => new Date(Date.parse(NOW) - h * 3_600_000).toISOString();

function request(over: Partial<PlanRequest> = {}): PlanRequest {
  return { account: "someone@example.com", wanted: "pro", askedAt: agoHours(2), state: "asked", ...over };
}

describe("which plan an account is on", () => {
  it("is Traveler when nobody has said otherwise", () => {
    // Every account made before plans existed. Nothing about it changes.
    assert.equal(planOf(undefined), "traveler");
    assert.equal(planOf(null), "traveler");
    assert.equal(planOf({}), "traveler");
    assert.equal(DEFAULT_PLAN, "traveler");
  });

  it("refuses a plan it does not know rather than taking it", () => {
    assert.equal(planOf({ plan: "platinum" }), "traveler");
    assert.equal(isAccountPlan("platinum"), false);
    assert.equal(isAccountPlan("pro"), true);
  });

  it("keeps a plan that was set", () => {
    assert.equal(planOf({ plan: "pro" }), "pro");
    assert.equal(planOf({ plan: "business" }), "business");
  });
});

describe("what a plan gets you", () => {
  it("IS NOTHING FOR TRAVELER, AND ONE THING FOR THE OTHERS", () => {
    // This said "nothing, for every one of them", because whatever Pro
    // included was the owner's to decide and writing it here would have put a
    // promise on the website nobody had agreed to keep. He has now decided the
    // first one: the assistant remembers a Pro conversation between visits.
    //
    // Traveler still gets an empty list, so the pages that read this must
    // still cope with one — an empty list under a heading reads as something
    // that failed to load, and they say it in a sentence instead.
    assert.deepEqual(whatYouGet("traveler"), []);
    for (const plan of ["pro", "business"] as const) {
      assert.ok(whatYouGet(plan).length > 0, plan);
    }
    // Every line is a plain promise to a traveler, not a feature name.
    for (const plan of ACCOUNT_PLANS) {
      for (const line of whatYouGet(plan)) {
        assert.ok(line.trim().length > 10, `${plan}: "${line}"`);
        assert.doesNotMatch(line, /[A-Z]{2,}|_|\bboolean\b/, `${plan}: that is a field name, not a promise`);
      }
    }
  });
});

describe("what you can ask about", () => {
  it("offers Gold and Business to somebody on Traveler", () => {
    assert.deepEqual(plansToAskAbout("traveler"), ["pro", "business"]);
  });

  it("does not offer somebody what they already have", () => {
    // Offering an "upgrade" to the plan you are on reads as the site not
    // knowing who you are.
    assert.ok(!plansToAskAbout("pro").includes("pro"));
    assert.ok(!plansToAskAbout("business").includes("business"));
  });

  it("still offers Business to somebody on Gold", () => {
    // Business is not further up than Pro, it is a different thing — a hotel
    // or a kitchen rather than a person who plans a lot of trips.
    assert.deepEqual(plansToAskAbout("pro"), ["business"]);
  });

  it("never offers Traveler as something to move to", () => {
    for (const plan of ACCOUNT_PLANS) assert.ok(!plansToAskAbout(plan).includes("traveler"), plan);
  });

  it("knows which way is up", () => {
    assert.equal(isUpgrade("traveler", "pro"), true);
    assert.equal(isUpgrade("pro", "traveler"), false);
    assert.equal(isUpgrade("pro", "pro"), false);
  });
});

describe("asking for one", () => {
  it("takes a plain request for Gold", () => {
    assert.equal(requestProblem({ current: "traveler", wanted: "pro" }), null);
  });

  it("will not take a plan it does not know", () => {
    assert.equal(requestProblem({ current: "traveler", wanted: "platinum" }), "Choose which kind of account you want.");
    assert.equal(requestProblem({ current: "traveler", wanted: undefined }), "Choose which kind of account you want.");
  });

  it("says so when you are already on it", () => {
    assert.equal(requestProblem({ current: "pro", wanted: "pro" }), "You are already on Gold.");
  });

  it("will not take a downgrade through this door", () => {
    // Nothing here can take a plan away. Whatever that eventually looks like,
    // it is not a form a person fills in about themselves.
    assert.equal(requestProblem({ current: "business", wanted: "pro" }), "That is not a change this can make.");
  });

  it("needs the name of the business for a Business account", () => {
    // The whole point of one is that it belongs to a business somebody can
    // find in the directory. A request that does not say which is a request
    // nobody can act on.
    assert.equal(requestProblem({ current: "traveler", wanted: "business" }), "Tell us the name of the business.");
    assert.equal(requestProblem({ current: "traveler", wanted: "business", businessName: "  " }), "Tell us the name of the business.");
    assert.equal(requestProblem({ current: "traveler", wanted: "business", businessName: "Hotel Sanz" }), null);
  });

  it("does not need a note", () => {
    assert.equal(requestProblem({ current: "traveler", wanted: "pro", note: "" }), null);
  });

  it("refuses a note longer than it will keep", () => {
    assert.match(String(requestProblem({ current: "traveler", wanted: "pro", note: "x".repeat(MAX_NOTE + 1) })), /under 600/);
  });
});

describe("how long it has been waiting", () => {
  it("says it the way a person would", () => {
    assert.equal(waitingFor(request({ askedAt: agoHours(0) }), NOW), "in the last hour");
    assert.equal(waitingFor(request({ askedAt: agoHours(5) }), NOW), "5 hours ago");
    assert.equal(waitingFor(request({ askedAt: agoHours(26) }), NOW), "yesterday");
    assert.equal(waitingFor(request({ askedAt: agoHours(72) }), NOW), "3 days ago");
  });

  it("does not pretend to know when it cannot", () => {
    assert.equal(waitingFor(request({ askedAt: "whenever" }), NOW), "at some point");
  });
});

describe("what the account page says", () => {
  it("names the plan", () => {
    assert.equal(describePlan("traveler", null), "You are on Traveler.");
  });

  it("says an open request is with a person", () => {
    // Somebody who asked and heard nothing needs to know the ask still exists.
    const said = describePlan("traveler", request());
    assert.match(said, /You asked about Gold/);
    assert.match(said, /we will be in touch/);
  });

  it("has a label for every plan", () => {
    for (const plan of ACCOUNT_PLANS) assert.ok(PLAN_LABELS[plan]?.length, plan);
  });
});
