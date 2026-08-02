import { NextRequest, NextResponse } from "next/server";
import { siteAlreadyHas } from "@/lib/place-offers";
import { searchEverything } from "@/lib/site-search";

/**
 * Which of these places is the site missing?
 *
 * Asked by the planner after somebody adds a stop or a hotel, so it can offer
 * to send in the ones we have not got. The search lives on the server because
 * the alternative is shipping every kever, town, attraction and hotel into the
 * browser to look through — which is why lib/site-search.ts exists at all.
 *
 * NAMES IN, NAMES OUT. Nothing about the trip is sent here: not the dates, not
 * the notes, not the trip. A name is the least that can answer the question,
 * and this is a read — it stores nothing and writes nothing anywhere.
 */

/** Enough for a long trip; past that somebody is doing something else. */
const MOST_AT_ONCE = 40;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { names?: unknown } | null;
  const names = Array.isArray(body?.names)
    ? body.names.filter((n): n is string => typeof n === "string" && n.trim().length > 0).slice(0, MOST_AT_ONCE)
    : [];
  if (names.length === 0) return NextResponse.json({ unknown: [] });

  const unknown: string[] = [];
  for (const name of names) {
    // A handful of hits is plenty: siteAlreadyHas only wants to know whether
    // any of them really IS this place, and a long tail of loose matches
    // cannot answer that question any better than the close ones can.
    const hits = await searchEverything(name, 6);
    if (!siteAlreadyHas(name, hits.map((hit) => hit.title))) unknown.push(name);
  }

  return NextResponse.json(
    { unknown },
    // A private question about somebody's own trip. Not for a shared cache.
    { headers: { "cache-control": "private, no-store" } },
  );
}
