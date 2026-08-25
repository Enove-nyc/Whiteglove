import { NextRequest, NextResponse } from "next/server";
import { kosherAreas } from "@/data/kosher-stays";
import { attractions } from "@/data/attractions";
import { kosherEateries } from "@/data/kosher-eateries";
import { notableShuls } from "@/data/notable-shuls";
import { nearest, parsePoint, RANGES, type NearbyThing } from "@/data/near-me";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * What is near a set of coordinates.
 *
 * NO KEY, NO NETWORK, NO COST. The hotel itself is found by
 * /api/lodging/places-search, which is metered and rate-limited because it
 * calls Google. This one only measures distances against files already in the
 * bundle, so it is cheap — but it is still rate limited, because an open
 * endpoint that walks four datasets per call is a free way to make the server
 * work.
 *
 * WHAT IT CAN AND CANNOT ANSWER. Every Jewish quarter, every notable shul and
 * 96% of the things to do carry coordinates. The kosher food listings mostly
 * do not — 28 of 1466 — and the mikvaos carry none at all. So this returns
 * quarters, shuls and things to do properly, returns the handful of food
 * listings that do have a position, and says nothing whatever about mikvaos
 * rather than returning an empty list somebody could read as "there are none
 * near you". See data/near-me.ts.
 */

const LIMIT = { limit: 40, windowSeconds: 60 };

export async function GET(request: NextRequest) {
  const flood = await rateLimit(`near:${requesterKey(request.headers)}`, LIMIT);
  if (!flood.ok) {
    return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  }

  const from = parsePoint(request.nextUrl.searchParams.get("at"));
  if (!from) {
    return NextResponse.json({ error: "Say where you are staying." }, { status: 400 });
  }

  const strip = <T>(rows: NearbyThing<T>[], shape: (item: T) => Record<string, unknown>) =>
    rows.map((row) => ({ ...shape(row.item), distance: row.distance, walk: row.walk, walkNote: row.walkNote }));

  const quarters = nearest(from, kosherAreas, {
    coordinatesOf: (area) => area.coordinates,
    within: RANGES.quarter,
    limit: 3,
  });
  const shuls = nearest(from, notableShuls, {
    coordinatesOf: (shul) => shul.coordinates,
    within: RANGES.shul,
    limit: 6,
  });
  const thingsToDo = nearest(from, attractions, {
    coordinatesOf: (attraction) => attraction.coordinates ?? null,
    within: RANGES.thingToDo,
    limit: 8,
  });
  const food = nearest(from, kosherEateries, {
    coordinatesOf: (eatery) => (eatery as { coordinates?: string }).coordinates ?? null,
    within: RANGES.food,
    limit: 6,
  });

  return NextResponse.json({
    quarters: strip(quarters, (area) => ({ name: area.name, city: area.city, note: area.note, href: "/hotels" })),
    shuls: strip(shuls, (shul) => ({ name: shul.name, address: shul.address, href: shul.href })),
    thingsToDo: strip(thingsToDo, (attraction) => ({
      name: attraction.name,
      city: attraction.city,
      href: `/things-to-do#${attraction.slug}`,
    })),
    food: strip(food, (eatery) => ({
      name: eatery.name,
      kind: eatery.kind,
      address: eatery.address ?? null,
      href: `/kosher#${eatery.slug}`,
    })),
  });
}
