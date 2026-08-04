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
 * AND THE TWO ARE ALL-OR-NOTHING. lib/directory.ts uses the built-in list as a
 * FALLBACK, not a base layer: the moment one row exists in the database, all
 * thirty disappear from the public site. So adding a single business silently
 * takes thirty off the directory — which is exactly what "my whole directory of
 * contacts vanished" looks like from the outside.
 *
 * Nothing here changes that behaviour. It makes it VISIBLE, which is the part
 * that was missing: the screen now lists what a visitor is actually being
 * shown, says where each entry comes from, and says what will happen when the
 * first one of his own is added.
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
  /** Which set a visitor is being shown right now. */
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
    // Matches lib/directory.ts exactly: one row of his own and the built-in
    // list is no longer used at all.
    showing: own.length > 0 ? "yours" : "built-in",
  };
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
      `You have not added any businesses of your own, so the directory is showing the ${list.builtInCount} that ship with the site. ` +
      `They are listed below and marked. Nothing is missing — but the moment you add one of your own, these ${list.builtInCount} stop being shown.`
    );
  }
  return (
    `The directory is showing your ${list.ownCount} ${list.ownCount === 1 ? "business" : "businesses"}. ` +
    `The ${list.builtInCount} that ship with the site are listed below and marked, and are NOT on the public directory — ` +
    `adding one of your own replaced them. Add any you still want by name.`
  );
}
