// One list of everything in the directory.
//
// The admin used to have four screens for what is really one question: "what do
// we hold about places?" Batei hachaim live in code with a database layer over
// them, towns and their practical listings live in Postgres, and businesses
// live in Redis. That split is real and is not being changed here — this
// gathers them into one index the owner can search, and each entry says where
// it is edited.

import { cemeteries } from "@/data/cemeteries";
import { destinations } from "@/data/destinations";
import { heritageTownHref } from "@/lib/route-migration";

export type DirectoryKind = "kever" | "town" | "business";

export type DirectoryEntry = {
  id: string;
  kind: DirectoryKind;
  /** What it is called. */
  name: string;
  city: string;
  country: string;
  /** Where the owner edits it. */
  editHref: string;
  /** Where a visitor sees it, when it has a public page. */
  viewHref?: string;
  published: boolean;
  /** Plain-English notes about what is missing — never blocking, just honest. */
  missing: string[];
  /** Everything a search should match, lowercased. */
  haystack: string;
};

const KIND_LABEL: Record<DirectoryKind, string> = {
  kever: "Beis hachaim",
  town: "Town",
  business: "Business",
};

export function kindLabel(kind: DirectoryKind): string {
  return KIND_LABEL[kind];
}

/** What is missing from a beis hachaim, in words the owner would use. */
function cemeteryGaps(c: (typeof cemeteries)[number]): string[] {
  const gaps: string[] = [];
  if (!c.coordinates) gaps.push("no exact grave location");
  if (!c.accessContacts?.some((x) => x.phone)) gaps.push("no shomer number");
  if (!c.sourceUrl) gaps.push("no source");
  if (!c.burials.length) gaps.push("nobody listed as buried here");
  return gaps;
}

/**
 * Everything, in one list.
 *
 * Reads from code for the batei hachaim and the towns — those are the source of
 * truth and are always available. Owner-added rows and businesses come from
 * their own stores and are merged in by the page, which can reach them.
 */
export function builtInDirectory(): DirectoryEntry[] {
  const out: DirectoryEntry[] = [];

  for (const c of cemeteries) {
    out.push({
      id: `kever:${c.slug}`,
      kind: "kever",
      name: c.name,
      city: c.city,
      country: c.country,
      editHref: `/admin/kevarim?slug=${c.slug}`,
      viewHref: `/cemeteries/${c.slug}`,
      published: true,
      missing: cemeteryGaps(c),
      haystack: `${c.name} ${c.yiddishName} ${c.city} ${c.yiddishCity} ${c.country} ${c.burials
        .map((b) => `${b.name} ${b.knownAs ?? ""}`)
        .join(" ")}`.toLowerCase(),
    });
  }

  for (const d of destinations) {
    out.push({
      id: `town:${d.slug}`,
      kind: "town",
      name: d.city,
      city: d.city,
      country: d.country,
      editHref: `/admin/destinations?slug=${d.slug}`,
      viewHref: heritageTownHref(d.slug),
      published: true,
      missing: [],
      haystack: `${d.city} ${d.yiddishCity ?? ""} ${d.country}`.toLowerCase(),
    });
  }

  return out;
}

export type DirectoryFilters = {
  query: string;
  kind: DirectoryKind | "all";
  country: string | "all";
  onlyMissing: boolean;
};

export function filterDirectory(entries: DirectoryEntry[], f: DirectoryFilters): DirectoryEntry[] {
  const q = f.query.trim().toLowerCase();
  return entries.filter((e) => {
    if (f.kind !== "all" && e.kind !== f.kind) return false;
    if (f.country !== "all" && e.country !== f.country) return false;
    if (f.onlyMissing && e.missing.length === 0) return false;
    if (q && !e.haystack.includes(q)) return false;
    return true;
  });
}

/** The countries present, most entries first, for the filter. */
export function countriesIn(entries: DirectoryEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.country, (counts.get(e.country) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}
