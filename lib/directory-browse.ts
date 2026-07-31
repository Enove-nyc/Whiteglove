import { destinationHref, guidedDestinations, unguidedDestinations } from "@/data/destinations";
import { getDestinationRecord } from "@/data/destination-database";
import { destinationTrust } from "@/lib/verification";
import type { CemeteryListItem } from "@/lib/cemeteries-view";
// The same folding the search bar uses: accents off, Hebrew kept. This file
// runs in the browser, and lib/place-search.ts imports nothing, so it costs
// the bundle only the few string functions it actually is.
import { normalize } from "@/lib/place-search";

/**
 * The public directory, small enough to send to a browser.
 *
 * 297 destinations were rendered as 297 cards, server-side, every time
 * somebody opened the page — no filters, no paging, the lot. Filtering that
 * in the browser needs the list in the browser, and sending the full records
 * would have swapped a rendering problem for a payload one.
 *
 * So this is the smallest thing that can answer every filter: the words
 * somebody searches by, the facts they filter on as booleans, and a link.
 * The keys are one letter because this array is serialised into the page
 * three hundred times over and the key names would outweigh the values.
 */

export type DirectoryKind = "guide" | "cemetery" | "destination";

export type DirectoryEntry = {
  s: string; // slug
  n: string; // name, English
  y: string; // name, Yiddish
  c: string; // country
  k: DirectoryKind;
  h: string; // href
  /** Everything searchable, pre-lowercased so the browser never has to. */
  q: string;
  /** How much has been checked: 2 verified, 1 partly, 0 not yet. */
  v: 0 | 1 | 2;
  /** Kevarim listed. */
  b: number;
  /** What the record actually holds. */
  f: { kosher: boolean; mikvah: boolean; stay: boolean; contact: boolean };
};

const published = (status: string | undefined) => status !== undefined && status !== "unavailable";

/**
 * What a destination actually has, from both places it can come from.
 *
 * The built-in records start with every practical section marked unavailable,
 * so reading only those makes every one of these filters permanently answer
 * nothing — including after the owner has added a dozen kosher restaurants in
 * the admin. `live` is what has actually been published.
 */
function flagsFor(slug: string, live: Map<string, Set<string>>): DirectoryEntry["f"] {
  const record = getDestinationRecord(slug);
  const categories = live.get(slug) ?? new Set<string>();
  return {
    kosher: published(record?.kosherFood.status) || categories.has("KOSHER_FOOD"),
    mikvah: published(record?.mikvaos.status) || categories.has("MIKVAH"),
    stay: published(record?.accommodations.status) || categories.has("ACCOMMODATION"),
    contact: Boolean(record?.cemeteries.some((cemetery) => cemetery.shomerContacts.length > 0)),
  };
}

function trustFor(slug: string): 0 | 1 | 2 {
  const record = getDestinationRecord(slug);
  if (!record) return 0;
  const level = destinationTrust(record).level;
  if (level === "verified") return 2;
  if (level === "partial" || level === "community") return 1;
  return 0;
}

/**
 * One list from the three the site keeps: researched guides, batei hachaim,
 * and destinations still being checked. They are genuinely different things
 * and the filter tells them apart — but somebody looking for Lizhensk should
 * not have to know which of three lists it is in first.
 */
export function buildDirectoryIndex(cemeteries: CemeteryListItem[], live: Map<string, Set<string>> = new Map()): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];

  for (const destination of guidedDestinations()) {
    const guide = destination.guide!;
    entries.push({
      s: destination.slug,
      n: destination.city,
      y: destination.yiddishCity,
      c: destination.country,
      k: "guide",
      h: destinationHref(destination),
      q: normalize(`${destination.city} ${destination.yiddishCity} ${destination.country} ${guide.tzaddik} ${guide.yiddishTzaddik} ${(destination.aliases ?? []).join(" ")}`),
      v: trustFor(destination.slug),
      b: 0,
      f: flagsFor(destination.slug, live),
    });
  }

  for (const cemetery of cemeteries) {
    entries.push({
      s: `cemetery-${cemetery.slug}`,
      n: cemetery.name,
      y: cemetery.yiddishName,
      c: cemetery.country,
      k: "cemetery",
      h: `/cemeteries/${cemetery.slug}`,
      q: normalize(`${cemetery.name} ${cemetery.yiddishName} ${cemetery.city} ${cemetery.yiddishCity} ${cemetery.country}`),
      v: trustFor(cemetery.slug),
      b: cemetery.burialCount,
      f: flagsFor(cemetery.slug, live),
    });
  }

  for (const destination of unguidedDestinations()) {
    entries.push({
      s: destination.slug,
      n: destination.city,
      y: destination.yiddishCity,
      c: destination.country,
      k: "destination",
      h: destinationHref(destination),
      q: normalize(`${destination.city} ${destination.yiddishCity} ${destination.country} ${(destination.aliases ?? []).join(" ")}`),
      v: trustFor(destination.slug),
      b: 0,
      f: flagsFor(destination.slug, live),
    });
  }

  return entries;
}

export type DirectoryFilters = {
  query: string;
  country: string;
  kind: DirectoryKind | "";
  /** Only records with something checked. */
  verifiedOnly: boolean;
  needs: Array<keyof DirectoryEntry["f"]>;
  letter: string;
  sort: "az" | "country" | "kevarim" | "checked";
};

export const NO_FILTERS: DirectoryFilters = {
  query: "", country: "", kind: "", verifiedOnly: false, needs: [], letter: "", sort: "az",
};

/**
 * Applies every filter at once.
 *
 * One pass, and the search text is part of it rather than a separate mode —
 * the old page swapped between "browsing" and "results", so choosing a
 * country and then typing threw the country away.
 */
export function filterDirectory(entries: DirectoryEntry[], filters: DirectoryFilters): DirectoryEntry[] {
  // Folded the same way the haystack was — see the note on `q`. Typing
  // "Krakow" has to find Kraków, because that is how somebody types it.
  const query = normalize(filters.query);
  const words = query ? query.split(/\s+/).filter(Boolean) : [];

  const matched = entries.filter((entry) => {
    if (filters.country && entry.c !== filters.country) return false;
    if (filters.kind && entry.k !== filters.kind) return false;
    if (filters.verifiedOnly && entry.v === 0) return false;
    for (const need of filters.needs) if (!entry.f[need]) return false;
    // The letter is about the English name, which is what the A–Z strip shows.
    if (filters.letter && firstLetter(entry.n) !== filters.letter) return false;
    // Every word has to appear somewhere, so "uman ukraine" narrows rather
    // than widening the way an OR would.
    return words.every((word) => entry.q.includes(word));
  });

  const sorters: Record<DirectoryFilters["sort"], (a: DirectoryEntry, b: DirectoryEntry) => number> = {
    az: (a, b) => a.n.localeCompare(b.n),
    country: (a, b) => a.c.localeCompare(b.c) || a.n.localeCompare(b.n),
    kevarim: (a, b) => b.b - a.b || a.n.localeCompare(b.n),
    checked: (a, b) => b.v - a.v || a.n.localeCompare(b.n),
  };
  return [...matched].sort(sorters[filters.sort]);
}

/** The letters that actually have something behind them. */
export function lettersIn(entries: DirectoryEntry[]): string[] {
  const letters = new Set<string>();
  for (const entry of entries) {
    const first = firstLetter(entry.n);
    if (first) letters.add(first);
  }
  return [...letters].sort();
}

/**
 * The letter a name files under, with its accent folded away.
 *
 * Łańcut begins with Ł, which is not A–Z, so it appeared under no letter at
 * all and the A–Z strip could not reach it. It files under L, where somebody
 * looking for it would look.
 */
function firstLetter(name: string): string {
  const first = normalize(name).trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "";
}

/** Countries present, with a count, commonest first. */
export function countriesIn(entries: DirectoryEntry[]): Array<{ value: string; label: string }> {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.c, (counts.get(entry.c) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([country, count]) => ({ value: country, label: `${country} (${count})` }));
}
