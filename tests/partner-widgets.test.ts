import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { carsEmbedPath, flightsEmbedPath } from "@/lib/partner-widget-paths";
import { AVIASALES_SEARCH_FORM, aviasalesWidgetSrc, LOCALRENT_SEARCH_FORM, localrentWidgetSrc } from "@/lib/partner-widgets";
import { isPrivatePath } from "@/lib/site-map";

describe("same-origin widget paths", () => {
  it("put the route and dates on /embed/flights, not on a partner host", () => {
    const path = flightsEmbedPath({
      origin: "JFK",
      destination: "FCO",
      departDate: "2026-09-12",
      returnDate: "2026-09-19",
      adults: 2,
    });
    assert.match(path, /^\/embed\/flights\?/);
    assert.match(path, /origin=JFK/);
    assert.match(path, /destination=FCO/);
    assert.match(path, /depart=2026-09-12/);
    assert.match(path, /return=2026-09-19/);
    assert.match(path, /adults=2/);
    assert.doesNotMatch(path, /tp\.media|aviasales|marker|shmarker/i);
  });

  it("drops junk instead of putting it on the embed address", () => {
    assert.equal(flightsEmbedPath({ origin: "not-an-airport", departDate: "soon" }), "/embed/flights");
    assert.doesNotMatch(carsEmbedPath({ location: "https://evil.example.com" }), /evil/);
  });
});

describe("Travelpayouts widget scripts", () => {
  it("put the marker on the Aviasales search form, not a Data API fare", () => {
    const previous = process.env.TRAVELPAYOUTS_MARKER;
    process.env.TRAVELPAYOUTS_MARKER = "761677";
    try {
      const src = aviasalesWidgetSrc({
        origin: "JFK",
        destination: "TLV",
        departDate: "2026-09-12",
        returnDate: "2026-09-19",
        adults: 1,
      });
      const url = new URL(src);
      assert.equal(url.origin + url.pathname, "https://tp.media/content");
      assert.equal(url.searchParams.get("shmarker"), "761677");
      assert.equal(url.searchParams.get("promo_id"), AVIASALES_SEARCH_FORM.promo_id);
      assert.equal(url.searchParams.get("campaign_id"), AVIASALES_SEARCH_FORM.campaign_id);
      assert.equal(url.searchParams.get("origin"), "JFK");
      assert.equal(url.searchParams.get("destination"), "TLV");
      assert.equal(url.searchParams.get("depart_date"), "2026-09-12");
      assert.equal(url.searchParams.get("return_date"), "2026-09-19");
      assert.match(url.searchParams.get("searchUrl") ?? "", /aviasales\.com/);
      assert.equal(url.searchParams.get("show_hotels"), "false");
    } finally {
      if (previous === undefined) delete process.env.TRAVELPAYOUTS_MARKER;
      else process.env.TRAVELPAYOUTS_MARKER = previous;
    }
  });

  it("puts the same marker on the Localrent car search form", () => {
    const previous = process.env.TRAVELPAYOUTS_MARKER;
    process.env.TRAVELPAYOUTS_MARKER = "761677";
    try {
      const src = localrentWidgetSrc();
      const url = new URL(src);
      assert.equal(url.searchParams.get("shmarker"), "761677");
      assert.equal(url.searchParams.get("promo_id"), LOCALRENT_SEARCH_FORM.promo_id);
      assert.equal(url.searchParams.get("campaign_id"), LOCALRENT_SEARCH_FORM.campaign_id);
    } finally {
      if (previous === undefined) delete process.env.TRAVELPAYOUTS_MARKER;
      else process.env.TRAVELPAYOUTS_MARKER = previous;
    }
  });

  it("builds nothing when the marker is missing, rather than an untracked widget", () => {
    const previous = process.env.TRAVELPAYOUTS_MARKER;
    delete process.env.TRAVELPAYOUTS_MARKER;
    try {
      assert.equal(aviasalesWidgetSrc({ origin: "JFK", destination: "FCO" }), "");
      assert.equal(localrentWidgetSrc(), "");
    } finally {
      if (previous !== undefined) process.env.TRAVELPAYOUTS_MARKER = previous;
    }
  });
});

describe("how the widgets are loaded", () => {
  it("uses next/script on the embed pages, without WordPress attributes", () => {
    const flights = readFileSync("app/embed/flights/page.tsx", "utf8");
    const cars = readFileSync("app/embed/cars/page.tsx", "utf8");
    assert.match(flights, /from "next\/script"/);
    assert.match(cars, /from "next\/script"/);
    assert.match(flights, /strategy="afterInteractive"/);
    assert.match(cars, /strategy="afterInteractive"/);
    for (const source of [flights, cars]) {
      assert.doesNotMatch(source, /data-no-optimize|data-wp-|noptimize/i);
    }
  });

  it("keeps the marker off the public booking panel", () => {
    const panel = readFileSync("components/BookPartners.tsx", "utf8");
    assert.match(panel, /\/embed\/flights|flightsEmbedPath/);
    assert.match(panel, /\/embed\/cars|carsEmbedPath/);
    assert.doesNotMatch(panel, /tp\.media|shmarker|TRAVELPAYOUTS_MARKER/);
    assert.doesNotMatch(panel, /\/api\/partners\/flights\/search/);
    assert.doesNotMatch(panel, /\/api\/partners\/cars\/search/);
  });

  it("keeps the embed addresses out of the sitemap and robots list", () => {
    assert.equal(isPrivatePath("/embed"), true);
    assert.equal(isPrivatePath("/embed/flights"), true);
    assert.equal(isPrivatePath("/embedded-tours"), false);
  });

  it("leaves Stay22 hotel live search in place and Duffel off /book", () => {
    const panel = readFileSync("components/BookPartners.tsx", "utf8");
    const hotels = readFileSync("app/api/partners/hotels/search/route.ts", "utf8");
    assert.match(panel, /\/api\/partners\/hotels\/search/);
    assert.match(hotels, /searchStay22Accommodations/);
    assert.doesNotMatch(panel, /@duffel|BookingSearch|FlightReview/);
  });
});
