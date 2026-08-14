import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  readOfferingHow,
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
  it("names the two accounts and opens neither, out of the box", () => {
    // The owner's decision while the prices were being settled: both may be
    // shown, nobody may sign up for either. "soon" promises nothing and cannot
    // charge anybody, which is why it is the safe thing to default to.
    assert.equal(DEFAULT_OFFERING.open, true);
    assert.equal(DEFAULT_OFFERING.how, "soon");
    for (const plan of PAID_PLANS) {
      assert.equal(DEFAULT_OFFERING.pricing[plan].monthlyPriceId, "");
      assert.equal(DEFAULT_OFFERING.pricing[plan].yearlyPriceId, "");
      assert.equal(DEFAULT_OFFERING.pricing[plan].askingLine, "");
    }
  });

  it("NEVER READS AS STRIPE UNLESS SOMEBODY WROTE STRIPE", () => {
    // The one that matters. Anything unreadable, absent, misspelled or
    // half-written is "soon", which can neither take money nor promise an
    // account.
    for (const raw of [null, undefined, {}, { how: "" }, { how: "STRIPE" }, { how: "card" }, { how: 1 }, "nonsense"]) {
      assert.equal(cleanOffering(raw).how, "soon", `${JSON.stringify(raw)} became something other than soon`);
    }
    assert.equal(cleanOffering({ how: "stripe" }).how, "stripe");
    assert.equal(cleanOffering({ how: "ask" }).how, "ask");
  });

  it("NEVER PROMISES AN ACCOUNT SOMEBODY CANNOT HAVE", () => {
    // The failure this setting exists to prevent: a record that means "not
    // open" being read as "ask", so the page invites a request the owner
    // cannot honour. Only the literal word "ask" is ask.
    assert.equal(cleanOffering({ how: "Ask" }).how, "soon");
    assert.equal(cleanOffering({ how: "asking" }).how, "soon");
  });

  it("shows both accounts while neither is open, and says nothing about money", () => {
    const soon = offering({
      how: "soon",
      pricing: {
        pro: { askingLine: "$4.99 a month", monthlyPriceId: "price_m", yearlyPriceId: "" },
        business: { askingLine: "", monthlyPriceId: "", yearlyPriceId: "" },
      },
    });
    assert.deepEqual(offerablePlans(soon), ["pro", "business"]);
    // No renewal to offer, because nothing is being charged...
    assert.deepEqual(periodsFor(soon, "pro"), []);
    // ...and no price either, even though one is typed in and a Stripe price
    // exists. A number beside an account nobody can have is the beginning of an
    // argument later about what was promised.
    assert.equal(offerLine(soon, "pro", "$4.99 a month"), "");
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

describe("reading which setting was chosen", () => {
  /**
   * THIS EXISTS BECAUSE THE MAPPING WAS ONCE WRITTEN TWICE.
   *
   * `cleanOffering` read a stored record; the admin's save action read the
   * form. When "soon" was added only the first was updated, so the screen
   * offered three settings and saving any of them wrote "ask" — the owner
   * chose "named, not open", pressed save, and watched it move to a setting he
   * had not picked, on a live site. Both callers now go through one function,
   * and this is the test that keeps it that way.
   */
  it("gives back exactly what was chosen, for all three", () => {
    assert.equal(readOfferingHow("soon"), "soon");
    assert.equal(readOfferingHow("ask"), "ask");
    assert.equal(readOfferingHow("stripe"), "stripe");
  });

  it("survives a form value, which arrives as a FormDataEntryValue", () => {
    const form = new FormData();
    form.set("how", "soon");
    assert.equal(readOfferingHow(form.get("how")), "soon");
    form.set("how", "stripe");
    assert.equal(readOfferingHow(form.get("how")), "stripe");
  });

  it("falls to the harmless setting on anything else", () => {
    for (const raw of [null, undefined, "", "Ask", "ASK", "asking", 1, {}, ["ask"]]) {
      assert.equal(readOfferingHow(raw), "soon", `${JSON.stringify(raw)} was not read as soon`);
    }
  });

  it("IS THE ONLY PLACE THE MAPPING LIVES", () => {
    // A second copy is not a duplicate, it is a fork waiting for the next
    // value to be added. If this fails, somebody has written the ternary again.
    const action = readFileSync("app/admin/settings/plans/actions.ts", "utf8");
    assert.match(action, /readOfferingHow\(form\.get\("how"\)\)/);
    assert.ok(!/"stripe"\s*\?\s*"stripe"\s*:/.test(action), "the save action maps the setting itself again");
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

  it("says what the owner typed, once the accounts are open to ask about", () => {
    const asking = offering({
      how: "ask",
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
