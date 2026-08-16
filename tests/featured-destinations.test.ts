import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getVacationDestination, type VacationDestination } from "@/data/vacation-destinations";
import { FEATURED_FALLBACK, featuredDestinations, pickFeatured } from "@/lib/featured-destinations";
import { mergeDestinationDayBuckets } from "@/lib/site-analytics";

/**
 * What the front page's Featured row shows.
 *
 * THE RULE THIS ENCODES: featured means "what people actually opened over the
 * trailing week", topped up from a written list while the data is thin — and
 * the visitor is never told which half a card came from, or why it is there.
 * The failure it guards is the quiet one: a row picked by hand once and never
 * again, or an analytics outage taking the front page down with it.
 *
 * Everything here runs against injected data. The redis edge is one function
 * (topSearchedDestinations) and the choosing is pure, which is the same split
 * lib/vacation-ideas.ts uses and for the same reason: the tests must not need
 * a redis to say whether the merge is right.
 */

/** A complete destination record with nothing in it but its identity. */
function place(slug: string, country = "Testland"): VacationDestination {
  return {
    slug,
    name: slug,
    country,
    cities: [slug],
    themes: ["city"],
    seasons: ["spring"],
    whyGo: "why",
    bestFor: ["testing"],
    suggestedLength: "2 days",
    overview: "overview",
    whyVisit: ["visit"],
    bestTime: "spring",
    suits: "suits",
    transport: "transport",
    cautions: [],
  };
}

const KNOWN = ["aleph", "beis", "gimmel", "daled", "hey", "vov", "zayin"].map((slug) => place(slug));
const FALLBACK = ["daled", "hey", "vov", "zayin"];

describe("the fallback list is real", () => {
  it("NAMES ONLY DESTINATIONS THAT EXIST, because a typo here is a shorter row, not an error", () => {
    for (const slug of FEATURED_FALLBACK) {
      assert.ok(getVacationDestination(slug), `${slug} is in FEATURED_FALLBACK and not in data/vacation-destinations.ts`);
    }
  });

  it("is a full row with no repeats", () => {
    // Four to six: enough that thin search data still fills the section, few
    // enough that it stays a row rather than becoming the directory.
    assert.ok(FEATURED_FALLBACK.length >= 4 && FEATURED_FALLBACK.length <= 6, String(FEATURED_FALLBACK.length));
    assert.equal(new Set(FEATURED_FALLBACK).size, FEATURED_FALLBACK.length);
  });
});

describe("choosing the row", () => {
  it("PUTS WHAT PEOPLE OPENED FIRST, in the order the week ranked them", () => {
    const chosen = pickFeatured(["gimmel", "aleph"], { limit: 4, destinations: KNOWN, fallback: FALLBACK });
    assert.deepEqual(chosen.map((f) => f.destination.slug), ["gimmel", "aleph", "daled", "hey"]);
  });

  it("TOPS UP FROM THE FALLBACK WHEN THE DATA IS THIN, so one search never renders a one-card section", () => {
    // Fewer than four distinct searched destinations is the thin case the
    // fallback exists for; the visitor cannot tell the halves apart.
    const chosen = pickFeatured(["beis"], { limit: 4, destinations: KNOWN, fallback: FALLBACK });
    assert.equal(chosen.length, 4);
    assert.deepEqual(chosen.map((f) => f.destination.slug), ["beis", "daled", "hey", "vov"]);
  });

  it("is the written fallback, in its written order, when nothing was searched at all", () => {
    const chosen = pickFeatured([], { limit: 4, destinations: KNOWN, fallback: FALLBACK });
    assert.deepEqual(chosen.map((f) => f.destination.slug), FALLBACK);
  });

  it("DROPS A SLUG IT CANNOT JOIN, from either half — analytics outlive a renamed destination", () => {
    const chosen = pickFeatured(["retired-page", "aleph"], {
      limit: 3,
      destinations: KNOWN,
      fallback: ["also-gone", "daled", "hey"],
    });
    assert.deepEqual(chosen.map((f) => f.destination.slug), ["aleph", "daled", "hey"]);
  });

  it("shows a destination once however many ways it earned the row", () => {
    const chosen = pickFeatured(["daled", "daled", "aleph"], { limit: 4, destinations: KNOWN, fallback: FALLBACK });
    assert.deepEqual(chosen.map((f) => f.destination.slug), ["daled", "aleph", "hey", "vov"]);
  });

  it("never exceeds the limit", () => {
    const chosen = pickFeatured(["aleph", "beis", "gimmel"], { limit: 2, destinations: KNOWN, fallback: FALLBACK });
    assert.equal(chosen.length, 2);
  });

  it("links every card to the destination's own page", () => {
    for (const { destination, href } of pickFeatured([], { limit: 6 })) {
      assert.equal(href, `/destinations/${destination.slug}`);
    }
  });
});

describe("merging the week's day buckets", () => {
  it("SUMS A DESTINATION ACROSS DAYS, so a steady week beats one loud afternoon", () => {
    const merged = mergeDestinationDayBuckets([
      [{ label: "rome", count: 2 }, { label: "paris", count: 5 }],
      [{ label: "rome", count: 2 }],
      [{ label: "rome", count: 2 }],
    ]);
    assert.deepEqual(merged, ["rome", "paris"]);
  });

  it("breaks ties by name, so the same week always builds the same front page", () => {
    const merged = mergeDestinationDayBuckets([[{ label: "vienna", count: 1 }, { label: "prague", count: 1 }]]);
    assert.deepEqual(merged, ["prague", "vienna"]);
  });

  it("says nothing for an empty week", () => {
    assert.deepEqual(mergeDestinationDayBuckets([]), []);
    assert.deepEqual(mergeDestinationDayBuckets([[], []]), []);
  });
});

describe("with no redis at all", () => {
  it("FAILS SAFE TO THE PURE FALLBACK — an analytics outage must not empty the front page", async () => {
    const saved = {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      const featured = await featuredDestinations(6);
      assert.deepEqual(featured.map((f) => f.destination.slug), [...FEATURED_FALLBACK]);
    } finally {
      if (saved.url !== undefined) process.env.UPSTASH_REDIS_REST_URL = saved.url;
      if (saved.token !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = saved.token;
    }
  });
});
