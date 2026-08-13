/**
 * What the businesses screen should actually show.
 *
 * THIS EXISTS BECAUSE THE SCREEN SAID "0 PROVIDERS" WHILE THE PUBLIC DIRECTORY
 * SHOWED THIRTY. The editor reads only the database; the thirty businesses in
 * data/directory.ts never had a row, so an owner with an empty table saw an
 * empty list and the words "Pick a provider or add a new one" — while every
 * visitor to /directory was being shown thirty businesses he had no screen for
 * and could not see, edit or remove.
 *
 * THE ALL-OR-NOTHING WARNING THAT USED TO BE HERE IS GONE, because the
 * behaviour it warned about is gone. lib/directory.ts once used the built-in
 * list as a FALLBACK: the moment one row existed in the database all thirty
 * disappeared from the public site, and adding a single business silently took
 * thirty off the directory. That was issues #210 and #212, and it was fixed —
 * every branch of readProviders() now MERGES, with the owner's own row winning
 * a collision by slug.
 *
 * This file was not updated with it, so the screen went on telling him the
 * built-ins were "NOT on the public directory" and that adding one of his own
 * "replaced them". Both false, and alarming in exactly the way the original
 * bug was. The rule below is the merge rule, and it has to stay equal to
 * lib/directory.ts:185.
 */

import { directoryProviders, type DirectoryProviderSeed } from "@/data/directory";

/** One row in the editor's list, whoever it belongs to. */
export type BusinessRow = {
  slug: string;
  name: string;
  category: string;
  /** True for the ones that ship in data/directory.ts and have no database row. */
  builtIn: boolean;
};

export type BusinessList = {
  rows: BusinessRow[];
  /** His own, in the database. */
  ownCount: number;
  /** The ones that ship with the site. */
  builtInCount: number;
  /**
   * Whether he has added any of his own yet.
   *
   * NOT "which set is live" any more — both sets are, always. It only changes
   * which sentence describes the screen.
   */
  showing: "yours" | "built-in";
};

/**
 * The editor's list: his own if he has any, and the built-in ones alongside.
 *
 * The built-ins are shown whether or not they are live, because an owner has to
 * be able to see what his own site is publishing. They are marked, so nobody
 * mistakes one for something he entered.
 */
export function businessList(own: Array<{ slug: string; name: string; category: string }>): BusinessList {
  const ownSlugs = new Set(own.map((p) => p.slug));
  const builtIn: BusinessRow[] = (directoryProviders as DirectoryProviderSeed[])
    // One his own list already covers is his; showing both would be the same
    // business twice under one name.
    .filter((p) => !ownSlugs.has(p.slug))
    .map((p) => ({ slug: p.slug, name: p.name, category: p.category, builtIn: true }));

  return {
    rows: [...own.map((p) => ({ ...p, builtIn: false })), ...builtIn],
    ownCount: own.length,
    builtInCount: builtIn.length,
    showing: own.length > 0 ? "yours" : "built-in",
  };
}

/**
 * Narrow the list by name or category.
 *
 * The editor listed his own businesses plus the thirty built-in ones in one
 * flat, unpaginated column with no way to search it — the browser next door
 * (`/admin/directory`) and the public directory both have a search box, and
 * this screen, the only one that can actually change a provider, did not.
 *
 * Accents are stripped both sides so "Rymanów" is found by typing "rymanow",
 * which is what somebody on an English keyboard types.
 */
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function filterBusinessRows(rows: BusinessRow[], query: string): BusinessRow[] {
  const q = fold(query.trim());
  if (!q) return rows;
  return rows.filter((row) => fold(`${row.name} ${row.category} ${row.slug}`).includes(q));
}

/**
 * What to tell him about the list, in one paragraph. Never null.
 *
 * The empty case is the one that sent somebody looking for a lost directory, so
 * it says the number a visitor is actually seeing rather than the number in the
 * database — those were the two figures that disagreed.
 */
export function describeBusinessList(list: BusinessList): string {
  if (list.showing === "built-in") {
    return (
      `You have not added any businesses of your own yet, so the directory is showing the ${list.builtInCount} that ship with the site. ` +
      `They are listed below and marked. Anything you add appears alongside them — adding one does not remove the rest.`
    );
  }
  return (
    `The directory is showing your ${list.ownCount} ${list.ownCount === 1 ? "business" : "businesses"} ` +
    `alongside the ${list.builtInCount} that ship with the site. All ${list.ownCount + list.builtInCount} are live. ` +
    `The built-in ones are listed below and marked; open one to edit it, and your version replaces it.`
  );
}
