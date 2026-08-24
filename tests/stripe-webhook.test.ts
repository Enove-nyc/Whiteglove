import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import { createCheckoutSession, customerIdOf, describePrice, setSubscriptionSeatQuantity, statusIsPaid, verifyWebhook } from "@/lib/stripe";

/**
 * The webhook signature, which is the only thing standing between the internet
 * and a free paid account.
 *
 * The endpoint's whole job is to put accounts onto paid plans. If this check
 * can be got past — by a missing header, an empty secret, a replayed capture, a
 * signature of the wrong length — then anybody who finds the URL can post a
 * made-up "payment succeeded" and grant themselves whatever they like. So every
 * way of getting past it that occurred to anybody is written down here.
 */

const SECRET = "whsec_testsecret";
const NOW = 1_760_000_000_000; // Fixed, so nothing here depends on the clock.

function sign(body: string, at = Math.floor(NOW / 1000), secret = SECRET) {
  const signature = createHmac("sha256", secret).update(`${at}.${body}`).digest("hex");
  return `t=${at},v1=${signature}`;
}

const BODY = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_1" } } });

describe("is this really from Stripe", () => {
  it("accepts a properly signed event", () => {
    const event = verifyWebhook(BODY, sign(BODY), SECRET, NOW);
    assert.equal(event?.type, "checkout.session.completed");
    assert.equal(event?.data.object.id, "cs_1");
  });

  it("REFUSES A BODY THAT HAS BEEN CHANGED BY ONE CHARACTER", () => {
    const header = sign(BODY);
    const tampered = BODY.replace("cs_1", "cs_2");
    assert.equal(verifyWebhook(tampered, header, SECRET, NOW), null);
  });

  it("refuses a signature made with a different secret", () => {
    assert.equal(verifyWebhook(BODY, sign(BODY, undefined, "whsec_somebodyelse"), SECRET, NOW), null);
  });

  it("refuses when there is no header, no secret or no body", () => {
    assert.equal(verifyWebhook(BODY, null, SECRET, NOW), null);
    assert.equal(verifyWebhook(BODY, sign(BODY), "", NOW), null);
    assert.equal(verifyWebhook("", sign(""), SECRET, NOW), null);
  });

  it("refuses a header with no timestamp or no v1", () => {
    const signature = createHmac("sha256", SECRET).update(`${Math.floor(NOW / 1000)}.${BODY}`).digest("hex");
    assert.equal(verifyWebhook(BODY, `v1=${signature}`, SECRET, NOW), null);
    assert.equal(verifyWebhook(BODY, `t=${Math.floor(NOW / 1000)}`, SECRET, NOW), null);
    assert.equal(verifyWebhook(BODY, "t=notanumber,v1=abc", SECRET, NOW), null);
  });

  it("REFUSES A CAPTURED REQUEST REPLAYED LATER", () => {
    // A valid signature stays valid for ever without this. Somebody who can
    // see one real webhook could otherwise replay it whenever they liked.
    const header = sign(BODY, Math.floor(NOW / 1000) - 3600);
    assert.equal(verifyWebhook(BODY, header, SECRET, NOW), null);
    // Inside the tolerance is still fine — clocks are not exact.
    assert.ok(verifyWebhook(BODY, sign(BODY, Math.floor(NOW / 1000) - 60), SECRET, NOW));
  });

  it("refuses a signature of the wrong length rather than throwing", () => {
    // timingSafeEqual throws on mismatched lengths, which would be a 500 and
    // a retry storm rather than a clean refusal.
    assert.equal(verifyWebhook(BODY, `t=${Math.floor(NOW / 1000)},v1=abc`, SECRET, NOW), null);
  });

  it("refuses a signed body that is not an event", () => {
    for (const body of ["not json", "{}", JSON.stringify({ type: "x" }), JSON.stringify({ data: { object: {} } })]) {
      assert.equal(verifyWebhook(body, sign(body), SECRET, NOW), null, `${body} was accepted`);
    }
  });
});

describe("reading what Stripe sent", () => {
  it("finds the customer id whether or not it is expanded", () => {
    assert.equal(customerIdOf("cus_1"), "cus_1");
    assert.equal(customerIdOf({ id: "cus_2" }), "cus_2");
    assert.equal(customerIdOf(null), "");
    assert.equal(customerIdOf({}), "");
  });

  it("counts a card that is retrying as still paid", () => {
    // Stripe retries a failed card for up to two weeks. Taking somebody's Pro
    // account away the morning their card expired, before they have had a
    // chance to fix it, is how a subscription business makes an enemy of a
    // customer who was going to keep paying.
    assert.equal(statusIsPaid("active"), true);
    assert.equal(statusIsPaid("trialing"), true);
    assert.equal(statusIsPaid("past_due"), true);
    assert.equal(statusIsPaid("canceled"), false);
    assert.equal(statusIsPaid("unpaid"), false);
    assert.equal(statusIsPaid("incomplete_expired"), false);
  });
});

describe("saying what a price is", () => {
  it("says nothing at all when there is nothing certain to say", () => {
    // A wrong price on a subscribe button is a complaint at best and a
    // chargeback at worst. No price is always better than a guess.
    assert.equal(describePrice(null), "");
    assert.equal(describePrice({ id: "p", unit_amount: null, currency: "usd" }), "");
  });

  it("drops the trailing zeros on a whole amount", () => {
    assert.equal(describePrice({ id: "p", unit_amount: 1200, currency: "usd", recurring: { interval: "month" } }), "$12 a month");
    assert.equal(describePrice({ id: "p", unit_amount: 1250, currency: "usd", recurring: { interval: "month" } }), "$12.50 a month");
  });

  it("says a year when it is a year, and counts when it is more than one", () => {
    assert.equal(describePrice({ id: "p", unit_amount: 12000, currency: "usd", recurring: { interval: "year" } }), "$120 a year");
    assert.equal(
      describePrice({ id: "p", unit_amount: 3000, currency: "usd", recurring: { interval: "month", interval_count: 3 } }),
      "$30 every 3 months",
    );
  });

  it("says the money without a period when nothing renews", () => {
    assert.equal(describePrice({ id: "p", unit_amount: 5000, currency: "usd" }), "$50");
  });
});

describe("starting a checkout", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });

  /** Stubs Stripe's response and hands back whatever body this call sent it. */
  function captureBody(): { body: string } {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const captured = { body: "" };
    globalThis.fetch = (async (_input, init) => {
      captured.body = String(init?.body ?? "");
      return new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/x" }), { status: 200 });
    }) as typeof fetch;
    return captured;
  }

  const base = {
    priceId: "price_1",
    account: "a@b.com",
    successUrl: "https://x/success",
    cancelUrl: "https://x/cancel",
  };

  it("ATTACHES A TRIAL TO THE SUBSCRIPTION, WHEN GIVEN ONE", async () => {
    // trial_period_days belongs on subscription_data, not the top-level body —
    // Stripe rejects it anywhere else.
    const captured = captureBody();
    await createCheckoutSession({ ...base, plan: "starter", trialDays: 14 });
    assert.match(captured.body, /subscription_data%5Btrial_period_days%5D=14/);
  });

  it("NEVER ATTACHES A TRIAL TO A ONE-TIME PURCHASE", async () => {
    // Stripe rejects trial_period_days outright in payment mode — this is not
    // just a copy decision, sending it here would fail the checkout entirely.
    const captured = captureBody();
    await createCheckoutSession({ ...base, plan: "one_trip", mode: "payment", trialDays: 14 });
    assert.doesNotMatch(captured.body, /trial_period_days/);
    assert.doesNotMatch(captured.body, /subscription_data/);
  });

  it("says nothing about a trial when none was asked for", async () => {
    const captured = captureBody();
    await createCheckoutSession({ ...base, plan: "starter" });
    assert.doesNotMatch(captured.body, /trial_period_days/);
  });
});

describe("changing an agency's seats on a live subscription", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });

  /** Every subscription read returns this fixed item list; every write is captured. */
  function mockSubscription(items: Array<{ id: string; price: { id: string } }>) {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const calls: Array<{ method: string; body: string }> = [];
    globalThis.fetch = (async (_input, init) => {
      calls.push({ method: init?.method ?? "GET", body: String(init?.body ?? "") });
      return new Response(JSON.stringify({ id: "sub_1", status: "active", customer: "cus_1", items: { data: items } }), { status: 200 });
    }) as typeof fetch;
    return calls;
  }

  it("READS FIRST, so it targets the item's own id rather than adding a duplicate", async () => {
    const calls = mockSubscription([
      { id: "si_pro", price: { id: "price_pro" } },
      { id: "si_seat", price: { id: "price_seat" } },
    ]);
    await setSubscriptionSeatQuantity({ subscriptionId: "sub_1", seatPriceId: "price_seat", quantity: 5 });
    assert.equal(calls[0].method, "GET");
    assert.match(calls[1].body, /items%5B0%5D%5Bid%5D=si_seat/);
    assert.match(calls[1].body, /items%5B0%5D%5Bquantity%5D=5/);
    assert.doesNotMatch(calls[1].body, /items%5B0%5D%5Bprice%5D/);
  });

  it("adds a new item when this seat price isn't on the subscription yet", async () => {
    const calls = mockSubscription([{ id: "si_pro", price: { id: "price_pro" } }]);
    await setSubscriptionSeatQuantity({ subscriptionId: "sub_1", seatPriceId: "price_seat", quantity: 3 });
    assert.match(calls[1].body, /items%5B0%5D%5Bprice%5D=price_seat/);
    assert.match(calls[1].body, /items%5B0%5D%5Bquantity%5D=3/);
    assert.doesNotMatch(calls[1].body, /items%5B0%5D%5Bid%5D/);
  });

  it("DELETES THE ITEM OUTRIGHT AT ZERO, rather than leaving a zero-quantity line on the invoice", async () => {
    const calls = mockSubscription([{ id: "si_seat", price: { id: "price_seat" } }]);
    await setSubscriptionSeatQuantity({ subscriptionId: "sub_1", seatPriceId: "price_seat", quantity: 0 });
    assert.match(calls[1].body, /items%5B0%5D%5Bid%5D=si_seat/);
    assert.match(calls[1].body, /items%5B0%5D%5Bdeleted%5D=true/);
  });

  it("does nothing at all — no second call — when there is no seat item to remove", async () => {
    const calls = mockSubscription([{ id: "si_pro", price: { id: "price_pro" } }]);
    const result = await setSubscriptionSeatQuantity({ subscriptionId: "sub_1", seatPriceId: "price_seat", quantity: 0 });
    assert.equal(calls.length, 1);
    assert.equal(result.ok, true);
  });
});
