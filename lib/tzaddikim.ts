/**
 * A page for each person, rather than a line on somebody else's page.
 *
 * Until now a tzadik existed only as an entry inside a beis hachaim: you could
 * read his name on the Lizhensk page, and that was the whole of it. There was
 * nowhere to send somebody who asks "where is the Noam Elimelech buried" —
 * which is how people actually search, by the person, not by the town. The
 * site knew the answer and had no page to put it on.
 *
 * The record is still the cemetery's; this is a view of it from the other end.
 * Nothing is duplicated, so a correction made in the admin shows here too.
 */

import { cemeteries, type Burial, type Cemetery } from "@/data/cemeteries";
import { normalize } from "@/lib/place-search";

export type TzaddikEntry = {
  slug: string;
  burial: Burial;
  cemetery: Cemetery;
};

/**
 * The address for a person.
 *
 * From his name, because that is what somebody types and what a link should
 * read as. Two of the 327 share a name with somebody else — the town is added
 * to those, and only those, so every other address stays the short one.
 */
export function tzaddikSlug(name: string): string {
  return normalize(name).replace(/\s+/g, "-").replace(/^-+|-+$/g, "") || "tzadik";
}

let cache: TzaddikEntry[] | null = null;

/** Everybody the site holds, with an address each. */
export function allTzaddikim(): TzaddikEntry[] {
  if (cache) return cache;

  const rows = cemeteries.flatMap((cemetery) =>
    cemetery.burials.map((burial) => ({ burial, cemetery, base: tzaddikSlug(burial.name) })),
  );

  // Which base slugs more than one person wants. Only those get the town.
  const seen = new Map<string, number>();
  for (const row of rows) seen.set(row.base, (seen.get(row.base) ?? 0) + 1);

  const used = new Set<string>();
  cache = rows.map(({ burial, cemetery, base }) => {
    let slug = seen.get(base)! > 1 ? `${base}-${cemetery.slug}` : base;
    // Belt and braces: if even that collides, keep it unique rather than
    // silently serving one person's page for another's name.
    while (used.has(slug)) slug = `${slug}-2`;
    used.add(slug);
    return { slug, burial, cemetery };
  });

  return cache;
}

export function getTzaddik(slug: string): TzaddikEntry | null {
  return allTzaddikim().find((entry) => entry.slug === slug) ?? null;
}

/** The address for a person on a given beis hachaim, for linking from it. */
export function hrefFor(name: string, cemeterySlug: string): string | null {
  const entry = allTzaddikim().find((e) => e.burial.name === name && e.cemetery.slug === cemeterySlug);
  return entry ? `/tzaddikim/${entry.slug}` : null;
}

/**
 * Everybody, sorted for a directory.
 *
 * By the name people know him as where there is one — somebody looking for the
 * Noam Elimelech is not looking under W for Weisblum.
 */
export function sortedTzaddikim(): TzaddikEntry[] {
  return [...allTzaddikim()].sort((a, b) =>
    (a.burial.knownAs || a.burial.name).localeCompare(b.burial.knownAs || b.burial.name),
  );
}

/** Everything to match a search against: both names, the seforim, the town. */
export function haystack(entry: TzaddikEntry): string {
  const { burial, cemetery } = entry;
  return [burial.name, burial.yiddishName, burial.knownAs, burial.seforim, cemetery.city, cemetery.yiddishCity, cemetery.country]
    .filter(Boolean)
    .join(" ");
}
