/**
 * Indexable commercial collection pages.
 *
 * THE HUB FILTERS BY QUERY STRING (`/destinations?season=winter`). That is a
 * useful browse, and a search engine treats every combination as one page.
 * Phase 4 asked for collection pages that can be indexed on their own — one
 * season, one kind of holiday, or the seasonal programmes — built only from
 * destinations and stays the site already holds.
 *
 * NOTHING IS INVENTED HERE. Titles and blurbs come from SEASONS and
 * TRIP_THEMES. A collection with nobody behind it is not offered, the same
 * rule as the hub filters and the front-page season row.
 */

import { kosherStays } from "@/data/kosher-stays";
import {
  SEASONS,
  TRIP_THEMES,
  vacationDestinations,
  type Season,
  type TripTheme,
  type VacationDestination,
} from "@/data/vacation-destinations";

export type CollectionKind = "season" | "theme" | "seasonal-programmes";

export type CollectionDef = {
  slug: string;
  kind: CollectionKind;
  title: string;
  intro: string;
  path: string;
};

export function collectionPath(slug: string): string {
  return `/collections/${slug}`;
}

const SEASON_VALUES = new Set<string>(SEASONS.map((entry) => entry.value));
const THEME_VALUES = new Set<string>(TRIP_THEMES.map((entry) => entry.value));

function seasonDef(season: Season): CollectionDef {
  const label = SEASONS.find((entry) => entry.value === season)?.label ?? season;
  return {
    slug: season,
    kind: "season",
    title: `${label} holidays`,
    intro: `Destinations on this site that work in ${label.toLowerCase()}. The list is the same records as the hub, not a second set of claims.`,
    path: collectionPath(season),
  };
}

function themeDef(theme: TripTheme): CollectionDef {
  const row = TRIP_THEMES.find((entry) => entry.value === theme);
  return {
    slug: theme,
    kind: "theme",
    title: row?.label ?? theme,
    intro: row?.blurb ?? "",
    path: collectionPath(theme),
  };
}

const PROGRAMMES: CollectionDef = {
  slug: "seasonal-programmes",
  kind: "seasonal-programmes",
  title: "Seasonal kosher programmes",
  intro:
    "Hotels that run a kosher kitchen for part of the year. The season is on each card — turning up outside it is a room and nothing to eat.",
  path: collectionPath("seasonal-programmes"),
};

export function collectionBySlug(slug: string): CollectionDef | null {
  if (slug === PROGRAMMES.slug) return PROGRAMMES;
  if (SEASON_VALUES.has(slug)) return seasonDef(slug as Season);
  if (THEME_VALUES.has(slug)) return themeDef(slug as TripTheme);
  return null;
}

function hasSeason(stay: { season?: string }): boolean {
  return Boolean(stay.season?.trim());
}

/**
 * Collections that actually have something behind them.
 *
 * Pass the same lists the pages read. Defaults are the built-in files, which
 * is what the sitemap uses.
 */
export function liveCollections(
  destinations: readonly VacationDestination[] = vacationDestinations,
  stays: readonly { season?: string }[] = kosherStays,
): CollectionDef[] {
  const out: CollectionDef[] = [];
  for (const season of SEASONS) {
    if (destinations.some((destination) => destination.seasons.includes(season.value))) {
      out.push(seasonDef(season.value));
    }
  }
  for (const theme of TRIP_THEMES) {
    if (destinations.some((destination) => destination.themes.includes(theme.value))) {
      out.push(themeDef(theme.value));
    }
  }
  if (stays.some(hasSeason)) out.push(PROGRAMMES);
  return out;
}

export function destinationsInCollection(
  slug: string,
  destinations: readonly VacationDestination[] = vacationDestinations,
): VacationDestination[] {
  const def = collectionBySlug(slug);
  if (!def || def.kind === "seasonal-programmes") return [];
  if (def.kind === "season") {
    return destinations.filter((destination) => destination.seasons.includes(def.slug as Season));
  }
  return destinations.filter((destination) => destination.themes.includes(def.slug as TripTheme));
}

export function staysInCollection<T extends { season?: string }>(
  slug: string,
  stays: readonly T[],
): T[] {
  const def = collectionBySlug(slug);
  if (def?.kind !== "seasonal-programmes") return [];
  return stays.filter(hasSeason);
}

export function collectionIsLive(
  slug: string,
  destinations: readonly VacationDestination[] = vacationDestinations,
  stays: readonly { season?: string }[] = kosherStays,
): boolean {
  return liveCollections(destinations, stays).some((entry) => entry.slug === slug);
}
