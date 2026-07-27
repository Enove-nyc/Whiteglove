// Look up coordinates for a place typed by hand, using Photon (OpenStreetMap) —
// the same free service behind the address autocomplete. Runs in the browser.
//
// This is what stops a hand-typed stop from silently counting as zero travel
// time. If nothing is found we return null and the planner says so, rather than
// pretending the distance is zero.

export async function geocodeOne(query: string): Promise<string | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> };
    const c = data.features?.[0]?.geometry?.coordinates;
    if (!c) return null;
    return `${c[1].toFixed(6)}, ${c[0].toFixed(6)}`;
  } catch {
    return null;
  }
}

/** Fill in coordinates for items missing them. Returns a map of id -> coords. */
export async function geocodeMissing(
  items: Array<{ id: string; name: string; address?: string; coordinates?: string }>,
): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  for (const item of items) {
    if (item.coordinates) continue;
    // The address is more precise; fall back to the place name.
    const coords = (await geocodeOne(item.address || item.name)) ?? (item.address ? await geocodeOne(item.name) : null);
    if (coords) found[item.id] = coords;
  }
  return found;
}
