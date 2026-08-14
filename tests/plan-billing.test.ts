import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanOffering,
  DEFAULT_OFFERING,
  describeOffering,
  offerablePlans,
  offeringProblem,
  offerLine,
  PAID_PLANS,
  periodsFor,
  planIsOfferable,
  priceIdFor,
  type PlanOffering,
} from "@/lib/plan-billing";

/**
 * Whether this site sells anything.
 *
 * MOST OF THESE TESTS ARE ABOUT NOT SELLING. The dangerous direction is a site
 * that charges somebody because a store blinked, a record was half-written or a
 * field was missing — so what is pinned down hardest here is that "stripe" is
 * reachable only by an explicit, complete, deliberate setting, and that
 * everything short of that behaves exactly as the site did before any of this
 * existed.
 */

const READY = { secretKey: true, webhookSecret: true };
const NOT_READY = { secretKey: false, webhookSecret: false };

function offering(over: Partial<PlanOffering> = {}): PlanOffering {
  return cleanOffering({ ...DEFAULT_OFFERING, ...over });
}

describe("what the site is offering", () => {
  it("is what it always was, out of the box", () => {
    // Open and "ask" — because the account page has offered "ask about Pro"
    // since long before there was billing, and a default of closed would have
    // silently removed a working feature from a live site.
    assert.equal(DEFAULT_OFFERING.open, true);
    assert.equal(DEFAULT_OFFERING.how, "ask");
    for (const plan of PAID_PLANS) {
      assert.equal(DEFAULT_OFFERING.pricing[plan].monthlyPriceId, "");
      assert.equal(DEFAULT_OFFERING.pricing[plan].yearlyPriceId, "");
      assert.equal(DEFAULT_OFFERING.pricing[plan].askingLine, "");
    }
  });

  it("NEVER READS AS STRIPE UNLESS SOMEBODY WROTE STRIPE", () => {
    // The one that matters. Anything unreadable, absent, misspelled or
    // half-written is "ask", which cannot take money.
    for (const raw of [null, undefined, {}, { how: "" }, { how: "STRIPE" }, { how: "card" }, { how: 1 }, "nonsense"]) {
      assert.equal(cleanOffering(raw).how, "ask", `${JSON.stringify(raw)} became something other than ask`);
    }
    assert.equal(cleanOffering({ how: "stripe" }).how, "stripe");
  });

  it("treats a record written before the switch existed as open", () => {
    // The other direction: an old record has no `open` field, and it should
    // keep behaving the way it did rather than close the offering.
    assert.equal(cleanOffering({ how: "ask" }).open, true);
    assert.equal(cleanOffering({ open: false }).open, false);
  });

  it("offers nothing at all when it is closed", () => {
    const closed = offering({ open: false });
    assert.deepEqual(offerablePlans(closed), []);
    for (const plan of PAID_PLANS) assert.equal(planIsOfferable(closed, plan), false);
    assert.match(describeOffering(closed), /^Closed\./);
  });

  it("offers only the plans that are ticked", () => {
    const only = offering({ plans: { pro: true, business: false } });
    assert.deepEqual(offerablePlans(only), ["pro"]);
  });
});

describe("what a plan may be offered on", () => {
  it("needs no price at all while somebody is only asking", () => {
    const asking = offering();
    assert.equal(planIsOfferable(asking, "pro"), true);
    // And nothing renews, because nothing is being charged.
    assert.deepEqual(periodsFor(asking, "pro"), []);
  });

  it("REFUSES A PLAN WITH NO PRICE ONCE CARDS ARE INVOLVED", () => {
    // Otherwise the account page draws a subscribe button that 500s, and the
    // person who discovers it is a customer rather than the owner.
    const cards = offering({ how: "stripe" });
    assert.equal(planIsOfferable(cards, "pro"), false);
    assert.deepEqual(offerablePlans(cards), []);
  });

  it("offers just the periods that have a price", () => {
    const cards = offering({
      how: "stripe",
      pricing: {
        pro: { askingLine: "", monthlyPriceId: "price_m", yearlyPriceId: "" },
        business: { askingLine: "", monthlyPriceId: "price_bm", yearlyPriceId: "price_by" },
      },
    });
    assert.deepEqual(periodsFor(cards, "pro"), ["monthly"]);
    assert.deepEqual(periodsFor(cards, "business"), ["monthly", "yearly"]);
    assert.equal(priceIdFor(cards, "business", "yearly"), "price_by");
    assert.equal(priceIdFor(cards, "pro", "yearly"), "");
  });
});

describe("what may be saved", () => {
  it("lets anything be closed", () => {
    assert.equal(offeringProblem(offering({ open: false }), NOT_READY), null);
    assert.equal(offeringProblem(offering({ open: false, how: "stripe" }), NOT_READY), null);
  });

  it("refuses an offering with nothing in it", () => {
    const empty = offering({ plans: { pro: false, business: false } });
    assert.match(offeringProblem(empty, READY) ?? "", /at least one/i);
  });

  it("refuses Stripe without the keys, and names which one is missing", () => {
    const cards = offering({ how: "stripe" });
    assert.match(offeringProblem(cards, NOT_READY) ?? "", /STRIPE_SECRET_KEY/);
    assert.match(offeringProblem(cards, { secretKey: true, webhookSecret: false }) ?? "", /STRIPE_WEBHOOK_SECRET/);
  });

  it("refuses Stripe with keys but no price", () => {
    const cards = offering({ how: "stripe" });
    const problem = offeringProblem(cards, READY) ?? "";
    assert.match(problem, /Pro and Business/);
    assert.match(problem, /price/i);
  });

  it("allows Stripe once a plan really can be charged", () => {
    const cards = offering({
      how: "stripe",
      plans: { pro: true, business: false },
      pricing: {
        pro: { askingLine: "", monthlyPriceId: "price_m", yearlyPriceId: "" },
        business: { askingLine: "", monthlyPriceId: "", yearlyPriceId: "" },
      },
    });
    assert.equal(offeringProblem(cards, READY), null);
  });
});

describe("what a traveller is told it costs", () => {
  it("says nothing when the owner has typed nothing", () => {
    assert.equal(offerLine(offering(), "pro"), "");
  });

  it("says what the owner typed, while nobody is being charged", () => {
    const asking = offering({
      pricing: {
        pro: { askingLine: "$12 a month", monthlyPriceId: "", yearlyPriceId: "" },
        business: { askingLine: "", monthlyPriceId: "", yearlyPriceId: "" },
      },
    });
    assert.equal(offerLine(asking, "pro"), "$12 a month");
  });

  it("IGNORES THE TYPED LINE ENTIRELY ONCE STRIPE IS DOING THE CHARGING", () => {
    // The typed line and the Stripe price drift apart the first time a price
    // changes in the dashboard, and the version somebody reads has to be the
    // one that will appear on their statement.
    const cards = offering({
      how: "stripe",
      pricing: {
        pro: { askingLine: "$4 a month", monthlyPriceId: "price_m", yearlyPriceId: "" },
        business: { askingLine: "", monthlyPriceId: "", yearlyPriceId: "" },
      },
    });
    assert.equal(offerLine(cards, "pro", "$18 a month"), "$18 a month");
    // And with nothing readable from Stripe, no price at all — never the
    // stale typed one.
    assert.equal(offerLine(cards, "pro", null), "");
    assert.equal(offerLine(cards, "pro", ""), "");
  });
});
