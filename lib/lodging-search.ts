// Search the site's own researched lodging (kosher-friendly guesthouses, hotels,
// hostels near the kevarim) for the itinerary planner's hotel picker. Pulls the
// ACCOMMODATION places we already gathered — inline on the cemetery listings and
// in the per-destination practical content — so a traveler can pick a place we
// have details for instead of typing them by hand.
//
// IMPORTANT: this data is gathered from public sources and flagged for owner
// confirmation before travelers rely on it; nothing here is invented.

import { cemeteries } from "@/data/cemeteries";
import { practicalContent } from "@/data/practical-content";
import { getAreaList, getStayList } from "@/lib/attractions-view";
import { fuzzyMatch, normalize } from "@/lib/place-search";

export type LodgingResult = {
  name: string;
  city: string;
  address?: string;
  phone?: string;
  notes?: string;
};

// Best-effort city label for a practical-content slug.
function cityForSlug(slug: string): string {
  const bySlug = cemeteries.find((c) => c.slug === slug || c.slug.startsWith(`${slug}-`) || normalize(c.city) === normalize(slug));
  if (bySlug) return bySlug.city;
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

async function collect(): Promise<LodgingResult[]> {
  const out: LodgingResult[] = [];
  const seen = new Set<string>();
  const push = (r: LodgingResult) => {
    const key = normalize(`${r.name} ${r.city}`);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  };

  for (const c of cemeteries) {
    for (const p of c.places ?? []) {
      if (p.category === "ACCOMMODATION") push({ name: p.name, city: c.city, address: p.address, phone: p.phone ?? p.whatsapp, notes: p.notes });
    }
  }
  for (const [slug, content] of Object.entries(practicalContent)) {
    for (const p of content.places ?? []) {
      if (p.category === "ACCOMMODATION") push({ name: p.name, city: cityForSlug(slug), address: p.address, phone: p.phone ?? p.whatsapp, notes: p.notes });
    }
  }

  // The researched stays and Jewish quarters (data/kosher-stays.ts plus
  // anything the owner has added). Read through the view rather than the data
  // file so a stay added in the admin turns up in this picker too — which is
  // the whole point of having one read layer.
  //
  // No coordinates are carried across. A stay's anchor coordinate belongs to
  // the SHUL it is measured from, not to the hotel, and putting it on the
  // lodging row would drop the map pin and every drive time on the wrong
  // building. The anchor is named in the note instead, which is the true thing
  // we know: near this, not at this.
  for (const s of await getStayList()) {
    push({
      name: s.name,
      city: s.city,
      notes: [s.season ? `Seasonal — ${s.season}` : null, s.summary, `Near ${s.anchor.name}.`].filter(Boolean).join(" "),
    });
  }
  for (const a of await getAreaList()) {
    push({ name: a.name, city: a.city, notes: a.note });
  }

  return out.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
}

// Cached per process. The stay/area half can come from the database, so the
// cache holds the promise rather than the value — two searches arriving at once
// on a cold process would otherwise both query.
let cache: Promise<LodgingResult[]> | null = null;
function all(): Promise<LodgingResult[]> {
  if (!cache) cache = collect();
  return cache;
}

export async function searchLodging(query: string, limit = 12): Promise<LodgingResult[]> {
  const q = query.trim();
  const list = await all();
  if (!q) return list.slice(0, limit);
  return list.filter((r) => fuzzyMatch(q, `${r.name} ${r.city} ${r.notes ?? ""}`)).slice(0, limit);
}
