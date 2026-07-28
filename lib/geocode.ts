// Look up coordinates for a place typed by hand, using Photon (OpenStreetMap) —
// the same free service behind the address autocomplete. Runs in the browser.
//
// This is what stops a hand-typed stop from silently counting as zero travel
// time. If nothing is found we return null and the planner says so, rather than
// pretending the distance is zero.
//
// The country comes back too, because a day that crosses a frontier can carry
// hours of queueing that no routing engine accounts for, and the planner can
// only warn about that if it knows which country each stop is in.

export type GeocodeHit = { coordinates: string; country?: string };

export async function geocodeOne(query: string): Promise<GeocodeHit | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { country?: string } }>;
    };
    const feature = data.features?.[0];
    const c = feature?.geometry?.coordinates;
    if (!c) return null;
    return { coordinates: `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`, country: feature?.properties?.country };
  } catch {
    return null;
  }
}

/** Fill in locations for items missing them. Returns a map of id -> hit. */
export async function geocodeMissing(
  items: Array<{ id: string; name: string; address?: string; coordinates?: string }>,
): Promise<Record<string, GeocodeHit>> {
  const found: Record<string, GeocodeHit> = {};
  for (const item of items) {
    if (item.coordinates) continue;
    // The address is more precise; fall back to the place name.
    const hit = (await geocodeOne(item.address || item.name)) ?? (item.address ? await geocodeOne(item.name) : null);
    if (hit) found[item.id] = hit;
  }
  return found;
}
