import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comparable, lowestComparable } from "@/lib/travel/compare";
import { providerIsAllowed, stageOf, DEFAULT_STAGES } from "@/lib/travel/registry";
import { searchProviders } from "@/lib/travel/search";
import { categoriseError, foldAttempt } from "@/lib/travel/telemetry";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { TravelOffer } from "@/lib/travel/types";

/**
 * The provider layer's three promises: nothing reaches a visitor before the
 * owner says so, one slow company cannot hold up a search, and two offers are
 * never called comparable unless they really are.
 */

type OfferOverride = Omit<Partial<TravelOffer>, "meta"> & { meta?: Partial<TravelOffer["meta"]> };

const offer = (over: OfferOverride = {}): TravelOffer => ({
  id: over.id ?? "a",
  category: over.category ?? "flight",
  headline: over.headline ?? "Test",
  price: over.price ?? { amount: 200, currency: "USD" },
  fulfilment: over.fulfilment ?? "deep-link",
  meta: {
    provider: "duffel",
    providerOfferId: "x",
    refundable: true,
    cabin: "economy",
    bags: 1,
    stops: 0,
    cancellation: "24h",
    ...over.meta,
  },
});

const provider = (
  id: ProviderSearch["id"],
  behaviour: { offers?: TravelOffer[]; fail?: Error; delayMs?: number; configured?: boolean },
): ProviderSearch => ({
  id,
  category: "car",
  configured: () => behaviour.configured !== false,
  async search(_query, signal) {
    if (behaviour.delayMs) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, behaviour.delayMs);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }
    if (behaviour.fail) throw behaviour.fail;
    return behaviour.offers ?? [];
  },
});

const QUERY = { destination: "Kraków", startDate: "2026-09-07", endDate: "2026-09-14" };

describe("nothing reaches a visitor until it is set live", () => {
  it("RouteStack starts off in every category", () => {
    for (const category of ["car", "hotel", "flight"] as const) {
      assert.equal(stageOf({}, "routestack", category), "off");
      assert.equal(providerIsAllowed({}, "routestack", category, "admin"), false);
      assert.equal(providerIsAllowed({}, "routestack", category, "public"), false);
    }
  });

  it("a provider in testing answers the admin and never a visitor", () => {
    const stages = { "routestack:car": "testing" } as const;
    assert.equal(providerIsAllowed(stages, "routestack", "car", "admin"), true);
    assert.equal(providerIsAllowed(stages, "routestack", "car", "public"), false);
  });

  it("only an explicit public stage reaches visitors", () => {
    const stages = { "routestack:car": "public" } as const;
    assert.equal(providerIsAllowed(stages, "routestack", "car", "public"), true);
  });

  it("the companies already serving visitors keep serving them", () => {
    // This file describes the site as it is. Turning these down would be a
    // change to the public site dressed up as configuration.
    assert.equal(DEFAULT_STAGES["stay22:hotel"], "public");
    assert.equal(DEFAULT_STAGES["travelpayouts:flight"], "public");
    // Duffel has always been admin-only, guarded at the endpoint.
    assert.equal(DEFAULT_STAGES["duffel:flight"], "testing");
  });
});

describe("one provider cannot ruin a search", () => {
  it("returns what worked when another throws", async () => {
    const outcome = await searchProviders(
      "car",
      [
        provider("routestack", { fail: Object.assign(new Error("boom"), { status: 500 }) }),
        provider("stay22", { offers: [offer({ id: "kept", category: "car" })] }),
      ],
      QUERY,
      { record: false },
    );
    assert.equal(outcome.offers.length, 1);
    assert.equal(outcome.offers[0].id, "kept");
    assert.equal(outcome.partial, true);
    assert.equal(outcome.tried.find((t) => t.provider === "routestack")?.error, "provider-error");
  });

  it("a slow provider is abandoned at the deadline, not waited for", async () => {
    const started = Date.now();
    const outcome = await searchProviders(
      "car",
      [
        provider("routestack", { delayMs: 5000 }),
        provider("stay22", { offers: [offer({ id: "fast", category: "car" })] }),
      ],
      QUERY,
      { record: false, deadlineMs: 300 },
    );
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 2000, `search took ${elapsed}ms — the deadline did not fire`);
    assert.equal(outcome.offers.length, 1);
    assert.equal(outcome.tried.find((t) => t.provider === "routestack")?.timedOut, true);
  });

  it("an unconfigured provider is not a failure", async () => {
    const outcome = await searchProviders(
      "car",
      [provider("routestack", { configured: false }), provider("stay22", { offers: [] })],
      QUERY,
      { record: false },
    );
    assert.equal(outcome.partial, false, "a company we have not signed up with is a normal state");
    assert.equal(outcome.tried.find((t) => t.provider === "routestack")?.error, "not-configured");
  });
});

describe("two offers are never called comparable unless they are", () => {
  it("accepts genuinely like-for-like", () => {
    assert.equal(comparable(offer(), offer({ id: "b" })).comparable, true);
  });

  it("refuses on cabin, bags, refundability, currency and how it is booked", () => {
    const cases: Array<[OfferOverride, string]> = [
      [{ meta: { cabin: "business" } }, "cabin"],
      [{ meta: { bags: 0 } }, "baggage"],
      [{ meta: { refundable: false } }, "refundability"],
      [{ price: { amount: 200, currency: "EUR" } }, "currency"],
      [{ fulfilment: "api-booking" }, "how it is booked"],
    ];
    for (const [over, field] of cases) {
      const verdict = comparable(offer(), offer({ id: "b", ...over }));
      assert.equal(verdict.comparable, false, `${field} should have stopped it`);
      assert.ok(verdict.differences.includes(field), `${field} not named: ${verdict.differences.join()}`);
    }
  });

  it("treats unknown as not comparable — silence is not a yes", () => {
    const unknown = offer({ id: "b", meta: { refundable: "unknown" } });
    assert.equal(comparable(offer(), unknown).comparable, false);
    // And two unknowns are still not a match.
    assert.equal(comparable(offer({ meta: { refundable: "unknown" } }), unknown).comparable, false);
  });

  it("refuses to name a cheapest across unlike products", () => {
    const cheapButWorse = offer({ id: "b", price: { amount: 90, currency: "USD" }, meta: { bags: 0 } });
    assert.equal(lowestComparable([offer(), cheapButWorse]), null);
  });

  it("names the cheapest when they really are alternatives", () => {
    const cheaper = offer({ id: "b", price: { amount: 150, currency: "USD" } });
    assert.equal(lowestComparable([offer(), cheaper])?.id, "b");
  });
});

describe("what the admin will read", () => {
  it("folds an attempt into a rolling record", () => {
    const first = foldAttempt(undefined, { provider: "routestack", category: "car", ok: true, ms: 400, count: 3 }, "2026-08-17T10:00:00Z");
    assert.equal(first.calls, 1);
    assert.equal(first.averageMs, 400);
    assert.equal(first.lastSuccessAt, "2026-08-17T10:00:00Z");

    const second = foldAttempt(first, { provider: "routestack", category: "car", ok: false, ms: 800, count: 0, error: "timeout" }, "2026-08-17T10:05:00Z");
    assert.equal(second.calls, 2);
    assert.equal(second.failures, 1);
    assert.equal(second.averageMs, 600);
    assert.equal(second.recentErrors[0].error, "timeout");
    // A failure must not erase the last time it worked.
    assert.equal(second.lastSuccessAt, "2026-08-17T10:00:00Z");
  });

  it("groups errors into kinds that have different fixes", () => {
    assert.equal(categoriseError(Object.assign(new Error("x"), { status: 401 })), "auth");
    assert.equal(categoriseError(Object.assign(new Error("x"), { status: 429 })), "rate-limited");
    assert.equal(categoriseError(Object.assign(new Error("x"), { status: 503 })), "provider-error");
    assert.equal(categoriseError(Object.assign(new Error("nope"), { name: "AbortError" })), "timeout");
    assert.equal(categoriseError(new Error("fetch failed")), "network");
  });

  it("keeps nothing a traveler typed", () => {
    // The record is provider, category, timing and an error KIND. If a
    // provider's own message could reach the store, a destination or a date
    // could travel with it.
    const folded = foldAttempt(undefined, { provider: "routestack", category: "car", ok: false, ms: 10, count: 0, error: "bad-request" }, "2026-08-17T10:00:00Z");
    assert.deepEqual(Object.keys(folded.recentErrors[0]).sort(), ["at", "error"]);
  });
});

describe("RouteStack is reached the way RouteStack asks", () => {
  it("signs apiKey:timestamp:nonce with the secret", async () => {
    const { signPartnerRequest } = await import("@/lib/travel/adapters/routestack-auth");
    const { createHmac } = await import("node:crypto");
    const config = { apiKey: "pub-key", secret: "the-secret", base: "https://example.test" };
    const expected = createHmac("sha256", "the-secret").update("pub-key:1700000000:abc").digest("hex");
    assert.equal(signPartnerRequest(config, 1700000000, "abc"), expected);
  });

  it("a different nonce or timestamp gives a different signature", async () => {
    const { signPartnerRequest } = await import("@/lib/travel/adapters/routestack-auth");
    const config = { apiKey: "k", secret: "s", base: "https://example.test" };
    const base = signPartnerRequest(config, 1700000000, "abc");
    assert.notEqual(signPartnerRequest(config, 1700000001, "abc"), base, "the timestamp must matter");
    assert.notEqual(signPartnerRequest(config, 1700000000, "abd"), base, "the nonce must matter");
  });

  it("needs both halves of the credential, never one", async () => {
    const { routestackConfig } = await import("@/lib/travel/adapters/routestack-auth");
    const before = { key: process.env.ROUTESTACK_API_KEY, secret: process.env.ROUTESTACK_API_SECRET };
    try {
      process.env.ROUTESTACK_API_KEY = "only-the-key";
      delete process.env.ROUTESTACK_API_SECRET;
      assert.equal(routestackConfig(), null, "a key without its secret cannot sign anything");
      process.env.ROUTESTACK_API_SECRET = "and-the-secret";
      assert.ok(routestackConfig(), "both together are a usable credential");
    } finally {
      if (before.key === undefined) delete process.env.ROUTESTACK_API_KEY;
      else process.env.ROUTESTACK_API_KEY = before.key;
      if (before.secret === undefined) delete process.env.ROUTESTACK_API_SECRET;
      else process.env.ROUTESTACK_API_SECRET = before.secret;
    }
  });

  it("is a hand-off, not a booking — no create-booking anywhere in the adapter", async () => {
    const { readFileSync } = await import("node:fs");
    const raw = readFileSync("lib/travel/adapters/routestack-cars.ts", "utf8");
    // Comments stripped: the file explains RouteStack's payment model at
    // length, and the rule is about what the code does, not what it says.
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    // They are merchant of record and own the checkout (/mcp/car/get-payment-url).
    assert.match(source, /fulfilment: "deep-link"/);
    // No booking call, and nothing that could carry a card. "creditCardRequired"
    // is theirs — a fact about the rental desk, not a payment path of ours.
    assert.doesNotMatch(source, /createBooking|createCarBooking/);
    assert.doesNotMatch(source, /payment_method|cardNumber|cvv|card_holder/i);
    assert.doesNotMatch(source, /get-payment-url/, "taking the checkout link is a later decision, not this adapter's job");
  });
});
