import { NextRequest, NextResponse } from "next/server";
import { zmanimForDay } from "@/lib/zmanim-day-calculate";
import type { ZmanimDay, ZmanimDayInput } from "@/lib/zmanim-day";

// Zmanim for the days of a trip, worked out on the server.
//
// The planner is a client component and the calculation carries the whole
// KosherJava port with it. Doing this here keeps that out of the bundle of
// everyone who never turns the times on, and lets one answer be cached for
// every traveller who is in Kraków on the same date.
//
// The trip itself never leaves the browser: what is posted is a date and a
// pair of coordinates per day, with no name, no title and nothing that says
// whose trip it is.

export const runtime = "nodejs";

/** A fortnight and a bit — longer than any itinerary the planner builds. */
const MAX_DAYS = 40;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function place(value: unknown): ZmanimDayInput["morning"] {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { coordinates?: unknown; country?: unknown };
  return {
    coordinates: typeof raw.coordinates === "string" ? raw.coordinates : undefined,
    country: typeof raw.country === "string" ? raw.country : undefined,
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  const days = (body as { days?: unknown })?.days;
  if (!Array.isArray(days)) {
    return NextResponse.json({ error: "Send { days: [...] }." }, { status: 400 });
  }

  const wanted: ZmanimDayInput[] = [];
  for (const entry of days.slice(0, MAX_DAYS)) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as { date?: unknown; morning?: unknown; evening?: unknown };
    if (typeof raw.date !== "string" || !DATE_RE.test(raw.date)) continue;
    wanted.push({ date: raw.date, morning: place(raw.morning), evening: place(raw.evening) });
  }

  // One bad day must not cost the others theirs — zmanimForDay reports its own
  // failures rather than throwing, so the map is total.
  const results: ZmanimDay[] = wanted.map((day) => zmanimForDay(day));

  return NextResponse.json(
    { days: results },
    {
      headers: {
        // The times for a place on a date do not change. Long cache, and the
        // request carries nothing identifying, so a shared one is safe.
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
