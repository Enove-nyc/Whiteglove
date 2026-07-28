// Real driving times for the itinerary planner.
//
// The work happens in /api/route-times on the server, which asks Google Routes
// (traffic-aware, so it matches what Google Maps would tell you) when a key is
// configured, and OSRM otherwise. This module is the browser side: it hands
// over the chains of coordinates and reports back what came home, including
// which engine answered — because a Maps time and a no-traffic estimate should
// never be shown to a traveler as if they were the same thing.

export type RoadTimeSource = "google" | "osrm";

export type RoadTimeResult = {
  /** Minutes per leg, keyed "fromCoords>toCoords". */
  times: Record<string, number>;
  /** Which engine produced each leg. */
  sources: Record<string, RoadTimeSource>;
  /** The engine that answered for this run, if any. */
  engine: RoadTimeSource | null;
  /** True when at least one chain could not be routed at all. */
  partial: boolean;
};

/** Stable key for one leg, so a cached time survives reordering. */
export function legKey(from?: string, to?: string): string {
  return `${(from ?? "").trim()}>${(to ?? "").trim()}`;
}

const EMPTY: RoadTimeResult = { times: {}, sources: {}, engine: null, partial: false };

/**
 * Road times for several chains, one per day. Chains whose every leg is already
 * known are not sent. Never throws — if routing is unreachable the planner
 * falls back to its own estimate and says so.
 */
export async function fetchRoadTimes(
  chains: string[][],
  cached: Record<string, number> = {},
  date?: string,
): Promise<RoadTimeResult> {
  const wanted = chains.filter(
    (chain) => chain.length >= 2 && !chain.slice(1).every((to, i) => cached[legKey(chain[i], to)] !== undefined),
  );
  if (!wanted.length) return EMPTY;
  try {
    const res = await fetch("/api/route-times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chains: wanted, date }),
    });
    if (!res.ok) return { ...EMPTY, partial: true };
    const data = (await res.json()) as Partial<RoadTimeResult>;
    return {
      times: data.times ?? {},
      sources: data.sources ?? {},
      engine: data.engine ?? null,
      partial: Boolean(data.partial),
    };
  } catch {
    return { ...EMPTY, partial: true };
  }
}
