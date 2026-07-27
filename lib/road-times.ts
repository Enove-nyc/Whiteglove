// Real driving times along actual roads, for the itinerary planner.
//
// The built-in figure is a straight-line estimate. This asks a routing engine
// (OSRM, the open-source router behind many map sites) for the real road route
// and its average-car duration, so a day's hours reflect real driving rather
// than crow-flight distance. Runs in the browser; falls back silently to the
// estimate when the router can't be reached.

/** Stable key for one leg, so a cached time survives reordering. */
export function legKey(from?: string, to?: string): string {
  return `${(from ?? "").trim()}>${(to ?? "").trim()}`;
}

function toLngLat(coordinates: string): string | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(coordinates);
  if (!m) return null;
  return `${Number(m[2])},${Number(m[1])}`; // OSRM wants lng,lat
}

const OSRM = "https://router.project-osrm.org/route/v1/driving/";

/**
 * One contiguous chain of places (anchor → stop → stop → …). Returns the road
 * minutes for each consecutive pair, keyed by legKey. A chain is a single
 * request, so a whole day costs one call.
 */
export async function fetchChainRoadTimes(chain: string[]): Promise<Record<string, number>> {
  const points = chain.map(toLngLat);
  if (points.some((p) => !p) || points.length < 2) return {};
  try {
    const res = await fetch(`${OSRM}${points.join(";")}?overview=false&annotations=duration`);
    if (!res.ok) return {};
    const data = (await res.json()) as { code?: string; routes?: Array<{ legs?: Array<{ duration?: number }> }> };
    if (data.code !== "Ok" || !data.routes?.[0]?.legs) return {};
    const legs = data.routes[0].legs;
    const out: Record<string, number> = {};
    legs.forEach((leg, i) => {
      if (typeof leg.duration !== "number") return;
      // Real road time, plus the same short allowance for parking and setting off.
      out[legKey(chain[i], chain[i + 1])] = Math.round(leg.duration / 60) + 10;
    });
    return out;
  } catch {
    return {};
  }
}

/** Road times for several chains (one per day). Skips pairs already cached. */
export async function fetchRoadTimes(chains: string[][], cached: Record<string, number> = {}): Promise<Record<string, number>> {
  const found: Record<string, number> = {};
  for (const chain of chains) {
    if (chain.length < 2) continue;
    // Skip a day whose every leg is already known.
    const allKnown = chain.slice(1).every((to, i) => cached[legKey(chain[i], to)] !== undefined);
    if (allKnown) continue;
    Object.assign(found, await fetchChainRoadTimes(chain));
  }
  return found;
}
