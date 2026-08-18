import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { cheapestFirst, comparable, lowestComparable } from "@/lib/travel/compare";
import { fingerprint, looksMasked } from "@/lib/travel/fingerprint";
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
  behaviour: {
    offers?: TravelOffer[];
    fail?: Error;
    delayMs?: number;
    configured?: boolean;
    fulfilment?: ProviderSearch["fulfilment"];
  },
): ProviderSearch => ({
  id,
  category: "car",
  fulfilment: behaviour.fulfilment ?? "deep-link",
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
  it("signs apiKey:timestamp:nonce as base64url — hex is refused as a dead account", async () => {
    // THE ENCODING IS THE WHOLE TRICK. Signed as hex the request is
    // well-formed and refused with "partner account is not found or not
    // active", which reads like a provisioning problem rather than a wrong
    // digest. This test is here so nobody has to learn that twice.
    const { signPartnerRequest } = await import("@/lib/travel/adapters/routestack-auth");
    const { createHmac } = await import("node:crypto");
    const config = { apiKey: "pub-key", secret: "the-secret", base: "https://example.test" };
    const message = "pub-key:1700000000:abc";
    assert.equal(
      signPartnerRequest(config, 1700000000, "abc"),
      createHmac("sha256", "the-secret").update(message).digest("base64url"),
    );
    assert.notEqual(
      signPartnerRequest(config, 1700000000, "abc"),
      createHmac("sha256", "the-secret").update(message).digest("hex"),
    );
  });

  it("signs with the secret rather than sending it", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("lib/travel/adapters/routestack-auth.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(source, /apiSecret:/, "the secret must not travel in the request body");
    assert.match(source, /hmac: signPartnerRequest/);
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

describe("a provider's own words help the admin and never reach the store", () => {
  it("the stored health row carries no provider message", () => {
    const withDetail = {
      provider: "routestack" as const,
      category: "car" as const,
      ok: false,
      ms: 400,
      count: 0,
      error: "auth" as const,
      detail: "Partner account is not found. Traveler searched Kraków 2026-09-07",
    };
    const folded = foldAttempt(undefined, withDetail, "2026-08-17T10:00:00Z");
    const serialised = JSON.stringify(folded);
    assert.doesNotMatch(serialised, /Kraków/, "a search must not reach the health record");
    assert.doesNotMatch(serialised, /Partner account/);
    assert.deepEqual(Object.keys(folded.recentErrors[0]).sort(), ["at", "error"]);
  });
});

describe("a fingerprint compares a credential without revealing one", () => {
  it("shows the ends and the length, and nothing in between", () => {
    const key = "sb_rst_PxcjqYYV0g8iRzQ4ImUMXTCTuJdEmFR2";
    const print = String(fingerprint(key));
    assert.match(print, /^sb_rst…mFR2 · 39 chars$/);
    // The whole point: what is shown must not be enough to sign with.
    assert.doesNotMatch(print, /PxcjqYYV0g8iRzQ4/);
    assert.ok(print.length < key.length, "a fingerprint longer than the secret is not a fingerprint");
  });

  it("says nothing at all for a variable that is not set", () => {
    assert.equal(fingerprint(undefined), null);
    assert.equal(fingerprint(""), null);
    assert.equal(fingerprint("   "), null);
  });

  it("REFUSES TO SPELL OUT A SHORT VALUE, which would be the whole of it", () => {
    // Six and four of a twelve-character value is ten of its twelve characters.
    const print = String(fingerprint("abcd1234efgh"));
    assert.equal(print, "12 characters");
    assert.doesNotMatch(print, /abcd/);
  });

  it("names the mistake it exists to catch: a masked value pasted from a dashboard", () => {
    const masked = "sb_b3ab20b6469c4170c2…884d59f3";
    assert.ok(looksMasked(masked));
    assert.match(String(fingerprint(masked)), /contains …/);
    assert.equal(looksMasked("sb_b3ab20b6469c4170c21179502d73ae55bc38cd25f3af1af8e8ca6b39884d59f3"), false);
    assert.equal(looksMasked(undefined), false);
  });

  it("counts a trailing space, because that is what a failed paste looks like", () => {
    assert.match(String(fingerprint(" sb_rst_PxcjqYYV0g8iRzQ4ImUMXTCTuJdEmFR2 ")), /39 chars/);
  });
});

describe("every category now has more than one company to ask", () => {
  it("registers two providers for flights and two for hotels", async () => {
    const { adaptersFor } = await import("@/lib/travel/engine");
    assert.deepEqual(adaptersFor("flight").map((a) => a.id).sort(), ["duffel", "routestack", "travelpayouts"]);
    assert.deepEqual(adaptersFor("hotel").map((a) => a.id).sort(), ["routestack", "stay22"]);
    // Cars still have one. Said out loud so the next person adding a car
    // company knows this is the gap and not an oversight of theirs.
    assert.deepEqual(adaptersFor("car").map((a) => a.id), ["routestack"]);
  });

  it("LEAVES TWO WHO MAY ACTUALLY FACE A TRAVELER IN EVERY CATEGORY BUT CARS", async () => {
    const { adaptersFor } = await import("@/lib/travel/engine");
    // Duffel is in the flight list and can never be counted among them: it
    // would make White Glove the seller. Without a second third party, setting
    // RouteStack public would give a visitor one company and call it a choice.
    for (const category of ["flight", "hotel"] as const) {
      const facing = adaptersFor(category).filter((a) => a.fulfilment !== "api-booking");
      assert.ok(facing.length >= 2, `${category} has ${facing.length} provider a visitor could ever see`);
    }
  });

  it("declares each adapter under the category it actually answers", async () => {
    const { adaptersFor } = await import("@/lib/travel/engine");
    for (const category of ["flight", "hotel", "car"] as const) {
      for (const adapter of adaptersFor(category)) {
        assert.equal(adapter.category, category, `${adapter.id} is filed under the wrong category`);
      }
    }
  });
});

describe("a flight search that cannot be answered is not guessed at", () => {
  const withRouteStackEnv = async (run: () => Promise<void>) => {
    const before = { key: process.env.ROUTESTACK_API_KEY, secret: process.env.ROUTESTACK_API_SECRET };
    process.env.ROUTESTACK_API_KEY = "sb_rst_test";
    process.env.ROUTESTACK_API_SECRET = "sb_secret_test";
    try {
      await run();
    } finally {
      if (before.key === undefined) delete process.env.ROUTESTACK_API_KEY;
      else process.env.ROUTESTACK_API_KEY = before.key;
      if (before.secret === undefined) delete process.env.ROUTESTACK_API_SECRET;
      else process.env.ROUTESTACK_API_SECRET = before.secret;
    }
  };

  it("RETURNS NOTHING RATHER THAN INVENTING A DEPARTURE CITY", async () => {
    // Every other search on this site has one place in it. A flight has two,
    // and a missing origin is not a hint to be filled in from the visitor's
    // country or the last thing they looked at — it is a question the provider
    // cannot be asked. Nothing is sent, so nothing is spent.
    await withRouteStackEnv(async () => {
      const { routestackFlights } = await import("@/lib/travel/adapters/routestack-flights");
      const offers = await routestackFlights.search(
        { destination: "KRK", startDate: "2026-09-30" },
        AbortSignal.timeout(1000),
      );
      assert.deepEqual(offers, []);
    });
  });

  it("refuses a flight comparison with no origin before spending a provider call", async () => {
    const source = readFileSync("app/api/admin/travel/compare/route.ts", "utf8");
    assert.match(source, /category === "flight" && !origin/);
    // The refusal must come before the search, not after it.
    assert.ok(
      source.indexOf('category === "flight" && !origin') < source.indexOf("await searchTravel"),
      "the check is below the call it is meant to prevent",
    );
  });
});

describe("the new adapters take money from nobody", () => {
  const readSource = (path: string) =>
    readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("RouteStack hotels and flights hand off and never book", () => {
    for (const path of [
      "lib/travel/adapters/routestack-hotels.ts",
      "lib/travel/adapters/routestack-flights.ts",
    ]) {
      const source = readSource(path);
      assert.match(source, /fulfilment: "deep-link"/, path);
      assert.doesNotMatch(source, /get-payment-url/, `${path} takes their checkout link`);
      assert.doesNotMatch(source, /cancel-booking|create-booking|revalidate/, path);
      assert.doesNotMatch(source, /payment_method|cardNumber|cvv|card_holder/i, path);
    }
  });

  it("Duffel is search only, however capable Duffel is of more", () => {
    const source = readSource("lib/travel/adapters/duffel-flights.ts");
    assert.match(source, /offer_requests/);
    // Duffel's booking calls. None of them belong in a search adapter.
    assert.doesNotMatch(source, /\/air\/orders|payment_intents|\/air\/payments/);
    assert.doesNotMatch(source, /payment_method|cardNumber|cvv/i);
  });

  it("no adapter writes a credential into what it returns", () => {
    for (const path of [
      "lib/travel/adapters/routestack-hotels.ts",
      "lib/travel/adapters/routestack-flights.ts",
      "lib/travel/adapters/duffel-flights.ts",
      "lib/travel/adapters/routestack-cars.ts",
    ]) {
      const source = readSource(path);
      // A token or secret in a headline, detail or meta field would travel to
      // the browser with the offer.
      assert.doesNotMatch(source, /headline:.*(token|secret|apiKey)/i, path);
      assert.doesNotMatch(source, /providerOfferId:.*(token|secret|apiKey)/i, path);
    }
  });
});

describe("a place a provider spells differently is still that place", () => {
  it("asks the flight index for a code when the car index draws a blank", () => {
    // Their car location index has no "Kraków" and no "Krakow"; it wants the
    // exonym "Cracow" or the code KRK. Their flight index answers KRK for
    // Kraków. Without this fallback every accented European destination on
    // this site returned no cars and looked like an empty market.
    const source = readFileSync("lib/travel/adapters/routestack-cars.ts", "utf8");
    assert.match(source, /routestackAirportCode/);
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.ok(
      stripped.lastIndexOf("routestackAirportCode") > stripped.indexOf("let best = pick(await ask(term))"),
      "the fallback must run after the ordinary lookup, not instead of it",
    );
  });
});

describe("a provider's document is not a provider's answer", () => {
  it("READS THEIR FIELD WHATEVER SHAPE IT ARRIVES IN", async () => {
    // RouteStack's OpenAPI declares mainamenity a string. Live, it is an array
    // of strings, and reviews — declared an object — is null on every hotel in
    // a 452-result Kraków search. Calling .trim() on the first one crashed the
    // whole search, which is the wrong way for one optional amenity line to
    // matter. Nothing read from a provider is trusted to be its declared type.
    const { asText } = await import("@/lib/travel/adapters/routestack-hotels");
    assert.equal(asText("accessible rooms"), "accessible rooms");
    assert.equal(asText(["accessible rooms"]), "accessible rooms");
    assert.equal(asText(["pool", "spa", "gym", "parking"]), "pool, spa, gym");
    assert.equal(asText([]), undefined);
    assert.equal(asText(null), undefined);
    assert.equal(asText(undefined), undefined);
    assert.equal(asText(42), undefined);
    assert.equal(asText({ name: "pool" }), undefined);
    assert.equal(asText("   "), undefined);
  });

  it("does not put a number through a string method anywhere it reads a hotel", () => {
    const source = readFileSync("lib/travel/adapters/routestack-hotels.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(source, /hotel\.mainamenity\?\.trim/);
    // reviews is null on every hotel their sandbox returns, so a rating may
    // only be printed after it has been proven to be a number.
    assert.match(source, /typeof hotel\.reviews\?\.rating === "number"/);
    assert.match(source, /typeof hotel\.ourprice === "number"/);
  });
});

describe("two columns in different orders are not a comparison", () => {
  it("PUTS THE CHEAPEST FIRST, WHICH IS WHAT THE HEADING ALREADY CLAIMS", () => {
    // A live Pune search: the heading said lowest USD 251.49 and the rows
    // under it ran 591, 994, 1086, 1131, 292. The provider with the better
    // price read as the expensive one.
    const priced = [591.66, 994.45, 1086.49, 1131.06, 292.91, 251.49].map((amount, index) =>
      offer({ id: `h${index}`, price: { amount, currency: "USD" } }),
    );
    assert.deepEqual(
      cheapestFirst(priced).map((o) => o.price?.amount),
      [251.49, 292.91, 591.66, 994.45, 1086.49, 1131.06],
    );
  });

  it("sorts an offer with no price last, because a missing number is not a low one", () => {
    const withNone = offer({ id: "none", price: undefined });
    const cheap = offer({ id: "cheap", price: { amount: 10, currency: "USD" } });
    assert.deepEqual(cheapestFirst([withNone, cheap]).map((o) => o.id), ["cheap", "none"]);
  });

  it("does not reorder the array it was handed", () => {
    const given = [
      offer({ id: "b", price: { amount: 9, currency: "USD" } }),
      offer({ id: "a", price: { amount: 1, currency: "USD" } }),
    ];
    cheapestFirst(given);
    assert.deepEqual(given.map((o) => o.id), ["b", "a"], "the caller's list must be left alone");
  });

  it("the comparison screen uses it rather than printing whatever arrived first", () => {
    const source = readFileSync("components/admin/ProviderComparison.tsx", "utf8");
    assert.match(source, /cheapestFirst\(/);
  });
});

describe("both flight providers read a place the same way", () => {
  it("uses the site's own airport list before asking a provider for a code", () => {
    // Two reasons, and the second one is why the first Kraków flight
    // comparison timed out. Asking RouteStack to resolve both ends costs two
    // network round trips before the search even starts, and our own resolver
    // already knows the answer. It also returns the metropolitan code where
    // there is one: LON finds 201 fares including Gatwick, LHR finds 183 and
    // misses the cheaper one.
    for (const path of [
      "lib/travel/adapters/routestack-flights.ts",
      "lib/travel/adapters/duffel-flights.ts",
    ]) {
      assert.match(readFileSync(path, "utf8"), /resolveEndpoint/, path);
    }
  });

  it("gives RouteStack long enough to answer, because it was measured", () => {
    // Their flight search takes eleven to seventeen seconds on a European
    // route with both location lookups already removed. A fifteen-second
    // deadline reported a timeout for a provider that was going to answer.
    const route = readFileSync("app/api/admin/travel/compare/route.ts", "utf8");
    const deadline = Number(/deadlineMs:\s*(\d+)/.exec(route)?.[1]);
    assert.ok(deadline >= 35000, `the comparison deadline is ${deadline}ms and RouteStack needs longer`);
    const adapter = readFileSync("lib/travel/adapters/routestack-flights.ts", "utf8");
    const own = Number(/^\s*(\d{4,}),$/m.exec(adapter.split("/mcp/flight/search")[1] ?? "")?.[1]);
    assert.ok(own >= 25000 && own < deadline, `the adapter's own timeout is ${own}ms`);
  });
});

describe("the comparison form says which date is which", () => {
  it("DOES NOT PUT TWO BOXES CALLED FROM AND TO BESIDE TWO MORE", () => {
    // A flight search already has a place it leaves from and a place it goes
    // to. Two date boxes wearing the same two words sat next to them, and the
    // first flight comparison came back marked one way in both columns because
    // the second date never got filled in. A form that loses half a search
    // without saying so is not a form.
    const source = readFileSync("components/admin/ProviderComparison.tsx", "utf8");
    assert.match(source, /flight: \["Depart", "Return"\]/);
    assert.match(source, /hotel: \["Check in", "Check out"\]/);
    assert.match(source, /car: \["Pick up", "Drop off"\]/);
    // The old bare labels must be gone, not merely joined by better ones.
    assert.doesNotMatch(source, /^\s+From\n/m);
    assert.doesNotMatch(source, /^\s+To\n/m);
  });
});

describe("a provider answering with invented data says so", () => {
  it("names a Duffel test key on the screen where its prices are read", () => {
    // Duffel issues separate test and live tokens and a test one returns
    // made-up fares. Both read "Present", so a column of plausible prices
    // could be the market or a fixture — on the one screen whose entire
    // purpose is deciding which company to believe.
    const source = readFileSync("app/admin/travel/page.tsx", "utf8");
    assert.match(source, /kind === "test"/);
    assert.match(source, /invented/);
    // Both directions. Warning only on the test key left silence carrying the
    // good news, and the fingerprint cannot settle it — every Duffel key on
    // earth prints as "duffel…", because both kinds share those six characters.
    assert.match(source, /kind === "live"/);
    assert.match(source, /real fares/i);
  });

  it("still never prints a key, whatever it says about one", () => {
    const source = readFileSync("app/admin/travel/page.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    // The only thing rendered from an environment variable is its fingerprint.
    const rendered = source.match(/\{process\.env\.[A-Z_]+\}/g);
    assert.equal(rendered, null, "an environment variable is being rendered whole");
    assert.match(source, /fingerprint\(value\)/);
  });
});

describe("a sandbox is never mistaken for a market", () => {
  it("DEFAULTS TO THE PRODUCTION HOST, BECAUSE THE OTHER DEFAULT FAILS QUIETLY", async () => {
    // RouteStack has two hosts: mcp is the live market, evolvemcp the sandbox.
    // Defaulting to the sandbox meant a deleted environment variable would go
    // on serving invented prices with nothing on any screen saying so.
    // Defaulting to production, the same mistake simply cannot authenticate.
    const before = {
      key: process.env.ROUTESTACK_API_KEY,
      secret: process.env.ROUTESTACK_API_SECRET,
      base: process.env.ROUTESTACK_API_BASE,
    };
    process.env.ROUTESTACK_API_KEY = "rst_test";
    process.env.ROUTESTACK_API_SECRET = "secret_test";
    delete process.env.ROUTESTACK_API_BASE;
    try {
      const { routestackConfig } = await import("@/lib/travel/adapters/routestack-auth");
      assert.equal(routestackConfig()?.base, "https://mcp.routestack.ai");
      process.env.ROUTESTACK_API_BASE = "https://evolvemcp.routestack.ai/";
      assert.equal(routestackConfig()?.base, "https://evolvemcp.routestack.ai", "a trailing slash must not survive");
    } finally {
      for (const [name, value] of [
        ["ROUTESTACK_API_KEY", before.key],
        ["ROUTESTACK_API_SECRET", before.secret],
        ["ROUTESTACK_API_BASE", before.base],
      ] as const) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it("says on the screen which of the two worlds a column of prices came from", () => {
    const source = readFileSync("app/admin/travel/page.tsx", "utf8");
    assert.match(source, /evolvemcp\./);
    assert.match(source, /not a live market/);
    assert.match(source, /Live market/);
    // The endpoint is an address, not a credential — fingerprinting it hid the
    // one thing worth reading.
    assert.match(source, /name\.endsWith\("_BASE"\)/);
  });
});

describe("a partial answer is not the whole market", () => {
  it("WAITS FOR THEIR SEARCH TO FINISH BEFORE BELIEVING THE COUNT", () => {
    // RouteStack's hotel search reports its own progress. The loop used to
    // stop at the first response carrying any hotels at all, which was
    // invisible against their sandbox — that answered Completed on the first
    // call with hundreds of rooms. Against production the first response is
    // partial: a Kraków search came back with two hostels in two seconds and
    // read as a city with two hotels in it.
    const source = readFileSync("lib/travel/adapters/routestack-hotels.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    assert.match(source, /answer\.status === "Completed"/);
    // The old exit condition. Its presence anywhere in the loop is the bug.
    assert.doesNotMatch(source, /if \(\(result\.result \?\? \[\]\)\.length\) break/);
    // A later partial must never replace an earlier fuller answer.
    assert.match(source, /\.length >= \(result\.result \?\? \[\]\)\.length\) result = answer/);
  });
});

describe("a timeout says whose patience ran out", () => {
  it("prints how long we waited, because that is the whole diagnosis", () => {
    // "Timed out" on its own cannot tell a slow provider from a limit of ours
    // set too low, and those want opposite responses. RouteStack came back at
    // 20,003ms against a twenty-second limit and read as broken.
    const source = readFileSync("components/admin/ProviderComparison.tsx", "utf8");
    assert.match(source, /we stopped waiting at \$\{\(attempt\.ms \/ 1000\)\.toFixed\(1\)\}s/);
  });

  it("gives both flight providers the same patience", () => {
    // Otherwise a comparison reporting two timeouts is telling us about two
    // different arbitrary limits of ours rather than about the providers.
    const timeoutIn = (path: string) => {
      const source = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      return Number(/timeoutMs: (\d+)|^\s*(\d{5}),$/m.exec(source)?.slice(1).find(Boolean));
    };
    assert.equal(
      timeoutIn("lib/travel/adapters/duffel-flights.ts"),
      timeoutIn("lib/travel/adapters/routestack-flights.ts"),
    );
  });
});

describe("no booking ever lands on White Glove", () => {
  it("REFUSES A SELLING PROVIDER A VISITOR EVEN WHEN THE SETTING SAYS PUBLIC", async () => {
    // The owner's rule: third parties take the booking, or nobody does. Duffel
    // is a real booking API — its order is ours, and so is the refund, the
    // chargeback and the phone call when a gate is locked. A stage is how far
    // a provider has been trusted; this is what it may be trusted with, and no
    // stage can grant it.
    const { weWouldBeTheSeller } = await import("@/lib/travel/engine");
    assert.equal(weWouldBeTheSeller("duffel", "flight"), true);
    assert.equal(weWouldBeTheSeller("routestack", "flight"), false);
    assert.equal(weWouldBeTheSeller("stay22", "hotel"), false);
    assert.equal(weWouldBeTheSeller("routestack", "car"), false);

    const source = readFileSync("lib/travel/engine.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    assert.match(source, /audience === "admin" \|\| provider\.fulfilment !== "api-booking"/);
  });

  it("refuses it at the setting too, and does not offer it on the screen", () => {
    const action = readFileSync("app/admin/travel/actions.ts", "utf8");
    assert.match(action, /stage === "public" && weWouldBeTheSeller\(provider, category\)/);
    const page = readFileSync("app/admin/travel/page.tsx", "utf8");
    assert.match(page, /sells \? null : <option value="public">/);
    assert.match(page, /White Glove would be the seller/);
  });

  it("every adapter says which kind of company it is", async () => {
    const { adaptersFor } = await import("@/lib/travel/engine");
    for (const category of ["flight", "hotel", "car"] as const) {
      for (const adapter of adaptersFor(category)) {
        assert.ok(
          ["api-booking", "deep-link", "widget"].includes(adapter.fulfilment),
          `${adapter.id} does not say who sells`,
        );
      }
    }
    // Exactly one selling provider exists today, and it is the one the rule
    // was written about. A second appearing without this test changing is
    // worth a person looking at it.
    const selling = (["flight", "hotel", "car"] as const).flatMap((c) =>
      adaptersFor(c).filter((a) => a.fulfilment === "api-booking").map((a) => `${a.id}:${c}`),
    );
    assert.deepEqual(selling, ["duffel:flight"]);
  });

  it("the default stages never start a selling provider in public", async () => {
    const { DEFAULT_STAGES } = await import("@/lib/travel/registry");
    const { weWouldBeTheSeller } = await import("@/lib/travel/engine");
    for (const [key, stage] of Object.entries(DEFAULT_STAGES)) {
      const [provider, category] = key.split(":") as ["duffel", "flight"];
      if (weWouldBeTheSeller(provider, category)) assert.notEqual(stage, "public", key);
    }
  });
});

describe("Travelpayouts answers without changing what /book does", () => {
  it("wraps the module rather than replacing it, exactly as Stay22 does", () => {
    const adapter = readFileSync("lib/travel/adapters/travelpayouts-flights.ts", "utf8");
    assert.match(adapter, /searchTravelpayoutsFlights/);
    // The public route must still call the module directly. If this adapter
    // ever became the path /book takes, deleting it would take /book with it.
    const route = readFileSync("app/api/partners/flights/offer/route.ts", "utf8");
    assert.doesNotMatch(route, /travel\/adapters/, "/book must not depend on the provider layer");
  });

  it("is a third party and says so, since that is the whole reason it is here", async () => {
    const { adaptersFor } = await import("@/lib/travel/engine");
    const tp = adaptersFor("flight").find((a) => a.id === "travelpayouts");
    assert.equal(tp?.fulfilment, "deep-link");
  });

  it("returns nothing rather than guessing when it cannot be asked", async () => {
    const { travelpayoutsFlights } = await import("@/lib/travel/adapters/travelpayouts-flights");
    const signal = AbortSignal.timeout(1000);
    assert.deepEqual(await travelpayoutsFlights.search({ destination: "KRK", startDate: "2026-09-30" }, signal), []);
    assert.deepEqual(
      await travelpayoutsFlights.search(
        { origin: "London", destination: "Nowhere-at-all", startDate: "2026-09-30" },
        signal,
      ),
      [],
    );
  });
});

describe("a provider's payload never reaches a browser", () => {
  const routes = [
    "app/api/travel/cars/search/route.ts",
    "app/api/admin/travel/compare/route.ts",
  ];

  it("EVERY ROUTE BUILDS ITS ANSWER FROM NAMED FIELDS, NEVER BY SPREADING AN OFFER", () => {
    // TravelOffer.raw carries RouteStack's whole car object, because their
    // checkout wants it back. One `...offer` anywhere would put a hundred
    // fields of a provider's internals on a public page and let anyone edit
    // the car they are about to be quoted for.
    for (const path of routes) {
      const source = readFileSync(path, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      assert.doesNotMatch(source, /\.\.\.offer\b/, `${path} spreads an offer`);
      assert.doesNotMatch(source, /\braw\s*:/, `${path} serialises a provider payload`);
      assert.doesNotMatch(source, /JSON\.stringify\(\s*outcome/, path);
    }
  });

  it("the public search sends a handle, not the car", () => {
    const source = readFileSync("app/api/travel/cars/search/route.ts", "utf8");
    assert.match(source, /keepForCheckout/);
    assert.match(source, /\/api\/travel\/cars\/go\?h=/);
    // One handle for the whole search. Seventy-one cars must not be
    // seventy-one writes.
    assert.equal((source.match(/keepForCheckout\(/g) ?? []).length, 1);
  });

  it("asks the public engine as the public, which is the whole point of the gate", () => {
    const source = readFileSync("app/api/travel/cars/search/route.ts", "utf8");
    assert.match(source, /searchTravel\("car",[\s\S]{0,120}"public"/);
  });
});

describe("the checkout hand-off leaves nothing on White Glove", () => {
  const source = readFileSync("app/api/travel/cars/go/route.ts", "utf8");

  it("REDIRECTS ONLY TO THE PROVIDER, SO A PUBLIC ROUTE IS NOT AN OPEN REDIRECT", () => {
    // The destination arrives from a third party. Following it wherever it
    // points would turn a link on this site into a way of sending somebody
    // anywhere at all.
    assert.match(source, /routestack\\\.ai\$\/\.test\(target\.hostname\)/);
  });

  it("takes the car from the server's handle, never from the request", () => {
    // Otherwise the price somebody is sent to pay is whatever they last typed
    // into the address bar.
    assert.match(source, /readForCheckout\(handle\)/);
    assert.doesNotMatch(source, /request\.json\(\)/);
    assert.match(source, /car: car\.car/);
  });

  it("holds no card, creates no order, and stores nothing about the traveler", () => {
    assert.doesNotMatch(source, /payment_method|cardNumber|cvv|card_holder/i);
    assert.doesNotMatch(source, /createOrder|prisma|recordBooking/i);
  });

  it("sends an expired quote back to search rather than explaining itself", () => {
    // Thirty minutes is all a handle lives, and an expired one is the ordinary
    // case: prices move and desks sell out.
    assert.match(source, /\/book\?kind=cars&expired=1/);
    assert.doesNotMatch(source, /handle (expired|not found)/i);
  });
});

describe("prices that take ten seconds do not hold up a page", () => {
  const source = readFileSync("components/CarPrices.tsx", "utf8");

  it("loads after the page rather than holding it", () => {
    // It once loaded above a partner panel that answered instantly, so a slow
    // provider cost nothing. The panel has gone — its inventory was thin and
    // these prices are wider and real — which makes loading after the page the
    // only thing keeping ten seconds off the page paint.
    assert.match(source, /useEffect/);
    const book = readFileSync("components/BookPartners.tsx", "utf8");
    assert.match(book, /<CarPrices destination=/);
    assert.doesNotMatch(book, /PartnerSearchWidget/);
  });

  it("abandons a search the traveler has moved on from", () => {
    assert.match(source, /new AbortController\(\)/);
    assert.match(source, /return \(\) => abort\.abort\(\)/);
  });

  it("SAYS WHITE GLOVE DOES NOT TAKE PAYMENT, ON THE PAGE WITH THE BUTTON", () => {
    assert.match(source, /White Glove does not take payment/);
    assert.match(source, /rental company&rsquo;s own checkout/);
  });

  it("SHOWS A VISITOR NOTHING AT ALL WHEN A PROVIDER FAILS", () => {
    // A traveler can do nothing about a provider being down, and the partner
    // search under this is a complete answer on its own. So a failure renders
    // as absence, not as an apology: no error state, no message, no mention of
    // any company by name.
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(stripped, /setError|errorMessage|\berror\b\s*&&/);
    assert.doesNotMatch(stripped, /RouteStack|Duffel|Stay22/);
    // The catch hands back an empty list, which the render treats as nothing
    // to show.
    assert.match(stripped, /catch \{[\s\S]{0,240}setAnswer\(\{ key, cars: \[\] \}\)/);
    assert.match(stripped, /if \(!cars\.length\) return null/);
  });
});

describe("the Cars tab can be searched", () => {
  const source = readFileSync("components/BookPartners.tsx", "utf8");

  it("ASKS WHERE AND WHEN, LIKE FLIGHTS AND HOTELS ALREADY DID", () => {
    // It never did. Cars showed a partner panel using whatever destination
    // arrived in the query string, so opening /book and pressing Cars gave a
    // panel with nothing in it and no way to say where or when. Survivable
    // while the panel was the whole answer; not once White Glove had prices of
    // its own, which need a place and two dates.
    const cars = source.slice(source.indexOf("function CarsForm"));
    assert.match(cars, /Pick-up city or airport/);
    assert.match(cars, /label="Pick-up"/);
    assert.match(cars, /label="Drop-off"/);
    assert.match(cars, /Search cars/);
  });

  it("searches on the button, not on every keystroke", () => {
    // A ten-second provider called from an onChange is a queue of abandoned
    // searches, one per letter typed.
    const cars = source.slice(source.indexOf("function CarsForm"));
    assert.match(cars, /<CarPrices destination=\{asked\?\.place/);
    assert.doesNotMatch(cars, /<CarPrices destination=\{place/);
  });

  it("refuses an incomplete search in its own words, before any provider is called", () => {
    const cars = source.slice(source.indexOf("function CarsForm"));
    assert.match(cars, /Enter a pick-up city or airport/);
    assert.match(cars, /Choose pick-up and drop-off dates/);
    assert.match(cars, /Drop-off must be on or after pick-up/);
  });
});

describe("a reload does not throw away a search", () => {
  const source = readFileSync("components/BookPartners.tsx", "utf8");

  it("KEEPS THE CHOSEN TAB, WHICH USED TO SNAP BACK TO WHERE TO STAY", () => {
    // The tab lived only in component state and the page defaults to Where to
    // stay, so anybody halfway through a car search who reloaded landed
    // somewhere else with everything they had typed gone.
    assert.match(source, /const chooseKind = \(next: Kind\) => \{/);
    assert.match(source, /url\.searchParams\.set\("type", next\)/);
    // Every tab must go through it, or the one that does not is the one that
    // loses the search.
    assert.equal((source.match(/onClick=\{\(\) => chooseKind\(/g) ?? []).length, 3);
    assert.doesNotMatch(source, /onClick=\{\(\) => setKind\(/);
  });

  it("writes the address bar without navigating, or it would undo itself", () => {
    // A router navigation re-renders the page and throws away the form state
    // this exists to protect.
    assert.match(source, /window\.history\.replaceState/);
    assert.doesNotMatch(source, /router\.(push|replace)\(/);
  });

  it("brings the car search back with its city and dates", () => {
    const cars = source.slice(source.indexOf("function CarsForm"));
    for (const param of ["destination", "depart", "return"]) {
      assert.match(cars, new RegExp(`searchParams\\.set\\("${param}"`), param);
    }
  });
});

describe("a provider with a monthly allowance is counted and stopped", () => {
  it("KNOWS ROUTESTACK'S FOUR HUNDRED AND LEAVES UNMETERED PROVIDERS ALONE", async () => {
    // Four hundred a month, a car search costs two, a hotel search up to six.
    // Inventing a ceiling for the affiliate integrations would turn a working
    // page off for no reason.
    const { monthlyLimit } = await import("@/lib/travel/provider-budget");
    assert.equal(monthlyLimit("routestack"), 400);
    assert.equal(monthlyLimit("stay22"), null);
    assert.equal(monthlyLimit("travelpayouts"), null);
    assert.equal(monthlyLimit("duffel"), null);
  });

  it("takes the number from the environment, because the plan is not ours to hardcode", async () => {
    const { monthlyLimit } = await import("@/lib/travel/provider-budget");
    const before = process.env.ROUTESTACK_MONTHLY_CALL_LIMIT;
    process.env.ROUTESTACK_MONTHLY_CALL_LIMIT = "2500";
    try {
      assert.equal(monthlyLimit("routestack"), 2500);
      process.env.ROUTESTACK_MONTHLY_CALL_LIMIT = "nonsense";
      assert.equal(monthlyLimit("routestack"), 400, "a bad value must not remove the ceiling");
    } finally {
      if (before === undefined) delete process.env.ROUTESTACK_MONTHLY_CALL_LIMIT;
      else process.env.ROUTESTACK_MONTHLY_CALL_LIMIT = before;
    }
  });

  it("counts by calendar month in UTC, so a month cannot be spent twice", async () => {
    const { monthKey } = await import("@/lib/travel/provider-budget");
    assert.equal(monthKey(new Date("2026-08-17T23:30:00Z")), "2026-08");
    assert.equal(monthKey(new Date("2026-09-01T00:00:00Z")), "2026-09");
    assert.equal(monthKey(new Date("2026-01-05T00:00:00Z")), "2026-01");
  });

  it("COUNTS THE SEARCHES AND NOT THE LOOKUPS AROUND THEM", () => {
    // RouteStack bills a search. Resolving a place name and minting a token
    // are free, so counting them would stop the provider early and put a
    // number on the admin screen that does not match theirs.
    const auth = readFileSync("lib/travel/adapters/routestack-auth.ts", "utf8");
    assert.match(auth, /BILLED_PATHS\.some\(\(billed\) => path\.startsWith\(billed\)\)/);
    assert.match(auth, /"\/mcp\/car\/search", "\/mcp\/hotel\/search-hotels", "\/mcp\/flight\/search"/);
    // The token mint is not counted, and neither is a location lookup.
    assert.equal((auth.match(/spendProviderCall\(/g) ?? []).length, 1);
    // Never awaited: a counter must not add a round trip to a search.
    assert.match(auth, /void spendProviderCall/);
  });

  it("stops asking a provider that has spent its month, for the admin too", () => {
    const engine = readFileSync("lib/travel/engine.ts", "utf8");
    assert.match(engine, /providerHasBudget/);
    // No audience check around the budget filter — testing spends the same
    // allowance a traveler does, and exempting the admin would make the number
    // on the screen a lie.
    const budgetLine = engine.slice(engine.indexOf("providerHasBudget"));
    assert.doesNotMatch(budgetLine.slice(0, 400), /audience === "admin"/);
  });

  it("keeps calling when it cannot tell, rather than silently disabling a good provider", async () => {
    // If the counter is unreachable the provider itself refuses, visibly, and
    // the page falls back. Refusing to call a provider that is probably fine
    // because a cache is down is the worse of the two.
    const source = readFileSync("lib/travel/provider-budget.ts", "utf8");
    assert.match(source, /if \(used === null\) return true/);
  });
});

describe("a car is shown as a car", () => {
  const component = readFileSync("components/CarPrices.tsx", "utf8");
  const adapter = readFileSync("lib/travel/adapters/routestack-cars.ts", "utf8");

  it("carries the provider's photograph and the rental company's mark", () => {
    assert.match(adapter, /image: car\.heroImage/);
    assert.match(adapter, /supplierLogo: car\.partner\?\.logo/);
    assert.match(component, /src=\{car\.image\}/);
    assert.match(component, /src=\{car\.supplierLogo\}/);
  });

  it("REFUSES THEIR 'NO PHOTOGRAPH' PLACEHOLDER, WHICH IS NOT A PHOTOGRAPH", () => {
    // About a quarter of cars point at no_car.jpg. A row showing that beside
    // rows showing real cars reads as a broken listing rather than an
    // unphotographed one, so it shows nothing instead.
    assert.match(adapter, /no_car/);
    assert.match(component, /car\.image \?/, "a car with no photograph must render no box");
  });

  it("names the rental company in the logo's alt text", () => {
    // Somebody choosing a car is choosing a desk as much as a vehicle, and a
    // logo with an empty alt tells a screen reader nothing at all.
    assert.match(component, /alt=\{car\.supplier \?\? ""\}/);
    // The car photograph is decoration beside a name that is already there.
    assert.match(component, /src=\{car\.image\}[\s\S]{0,80}alt=""/);
  });

  it("falls back to the company's name when there is no mark", () => {
    assert.match(component, /\) : car\.supplier \?/);
  });
});

describe("the place is chosen, not guessed at", () => {
  it("USES THE SITE'S OWN LIST RATHER THAN SPENDING THE PROVIDER'S ALLOWANCE", () => {
    // RouteStack can resolve a place name, and their plan allows four hundred
    // calls a month. An autocomplete calling them spends one per keystroke —
    // a single impatient typist would eat a week of the allowance.
    const source = readFileSync("components/BookPartners.tsx", "utf8");
    const cars = source.slice(source.indexOf("function CarsForm"));
    assert.match(cars, /<AirportAutocomplete value=\{place\}/);
    assert.doesNotMatch(cars, /\/mcp\/car\/locations/);
  });
});
