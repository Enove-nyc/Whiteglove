// Public read layer for holiday destinations.
//
// WHY THIS FILE EXISTS. The twenty built-in destinations live in
// data/vacation-destinations.ts. Anything the owner writes in the admin lives
// in the database. If each screen reached for whichever of the two it happened
// to know about, a destination edited in the admin would show on one page and
// still say the old thing on the next — which is exactly what already happened
// once with attractions, and why lib/attractions-view.ts exists.
//
// AN OVERLAY, NOT A REPLACEMENT. A database row does not stand in for a
// built-in destination; it edits one. Only the fields actually filled in
// replace what the file says, so an untouched destination keeps tracking the
// file and a touched one changes only where it was touched. Copying the file
// into the database instead would freeze twenty carefully written records at
// whatever they said on the day of the copy.
//
// FAIL SAFE: with the database off or unreachable this returns the built-in
// list, so the destination pages never go blank.

import {
  SEASONS as SEASON_OPTIONS,
  TRIP_THEMES,
  vacationDestinations as builtIn,
  type Season,
  type TripTheme,
  type VacationDestination,
} from "@/data/vacation-destinations";
import { cachedRead } from "@/lib/cache-tags";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

/**
 * Every write to a vacation destination busts this — saving one in the admin,
 * hiding one, adding one, and publishing or removing one of its pictures. Miss
 * one and that path goes stale silently for an hour.
 */
export const VACATION_DESTINATIONS_TAG = "vacation-destinations";

export type DestinationPhoto = {
  id: string;
  url: string;
  caption?: string;
  credit?: string;
};

export type VacationDestinationItem = VacationDestination & {
  /** True when the owner wrote it rather than the site shipping with it. */
  ownerAdded: boolean;
  /** True when a built-in destination has owner edits sitting on top of it. */
  edited: boolean;
  photos: readonly DestinationPhoto[];
};

/**
 * READ FROM THE ONE LIST, NOT COPIED FROM IT.
 *
 * These were written out again here as six themes, and the site has seven —
 * "heritage" was missing. The editor offers every one of the seven, because it
 * reads TRIP_THEMES; the admin saved whichever the owner ticked; and then this
 * filter threw "heritage" away on the way back out. So ticking Heritage,
 * pressing save and being told it saved left the destination absent from the
 * Heritage filter, with nothing anywhere to say why. A copy of a list is a
 * list that will disagree with the original eventually, and this one already
 * did on the day it was written.
 */
const THEMES: readonly string[] = TRIP_THEMES.map((theme) => theme.value);
const SEASONS: readonly string[] = SEASON_OPTIONS.map((season) => season.value);

/** A stored string is only a theme if it is one of ours; anything else is dropped. */
function asThemes(values: readonly string[]): TripTheme[] {
  return values.filter((value): value is TripTheme => THEMES.includes(value));
}

function asSeasons(values: readonly string[]): Season[] {
  return values.filter((value): value is Season => SEASONS.includes(value));
}

/** Blank means "no opinion" — the built-in text stands. Whitespace is blank. */
function said(value: string | null | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

function saidList(values: readonly string[] | null | undefined): readonly string[] | undefined {
  const list = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

type Row = {
  slug: string;
  status: string;
  name: string | null;
  country: string | null;
  region: string | null;
  cities: string[];
  kosherBaseCities: string[];
  kosherBaseNote: string | null;
  themes: string[];
  seasons: string[];
  whyGo: string | null;
  bestFor: string[];
  suggestedLength: string | null;
  overview: string | null;
  whyVisit: string[];
  bestTime: string | null;
  suits: string | null;
  transport: string | null;
  outlineTitle: string | null;
  outlineDays: string[];
  cautions: string[];
  photos: { id: string; url: string; caption: string | null; credit: string | null }[];
};

function photosOf(row: Row): DestinationPhoto[] {
  return row.photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    caption: said(photo.caption),
    credit: said(photo.credit),
  }));
}

/**
 * One destination, with the owner's edits laid over the built-in text.
 *
 * `base` is absent for a destination the file never had, and then the row has
 * to carry everything a page needs itself. A missing name would render a
 * heading with nothing in it, so it falls back to the slug rather than to
 * empty — a destination called "krakow-2" is wrong but visible, and visible is
 * what gets it fixed.
 */
function overlay(base: VacationDestination | undefined, row: Row): VacationDestinationItem {
  const empty: VacationDestination = {
    slug: row.slug,
    name: row.slug,
    country: "",
    cities: [],
    themes: [],
    seasons: [],
    whyGo: "",
    bestFor: [],
    suggestedLength: "",
    overview: "",
    whyVisit: [],
    bestTime: "",
    suits: "",
    transport: "",
    cautions: [],
  };
  const from = base ?? empty;

  const kosherBaseCities = saidList(row.kosherBaseCities);
  const kosherBaseNote = said(row.kosherBaseNote);
  const outlineDays = saidList(row.outlineDays);
  const outlineTitle = said(row.outlineTitle);

  return {
    ...from,
    slug: row.slug,
    name: said(row.name) ?? from.name,
    country: said(row.country) ?? from.country,
    region: said(row.region) ?? from.region,
    cities: saidList(row.cities) ?? from.cities,
    // Both halves or neither: a note about where the food comes from with no
    // town named is a sentence that cannot be acted on.
    kosherBase:
      kosherBaseCities && kosherBaseNote
        ? { cities: kosherBaseCities, note: kosherBaseNote }
        : from.kosherBase,
    themes: asThemes(row.themes).length ? asThemes(row.themes) : from.themes,
    seasons: asSeasons(row.seasons).length ? asSeasons(row.seasons) : from.seasons,
    whyGo: said(row.whyGo) ?? from.whyGo,
    bestFor: saidList(row.bestFor) ?? from.bestFor,
    suggestedLength: said(row.suggestedLength) ?? from.suggestedLength,
    overview: said(row.overview) ?? from.overview,
    whyVisit: saidList(row.whyVisit) ?? from.whyVisit,
    bestTime: said(row.bestTime) ?? from.bestTime,
    suits: said(row.suits) ?? from.suits,
    transport: said(row.transport) ?? from.transport,
    outline: outlineTitle && outlineDays ? { title: outlineTitle, days: outlineDays } : from.outline,
    cautions: saidList(row.cautions) ?? from.cautions,
    ownerAdded: !base,
    edited: Boolean(base),
    photos: photosOf(row),
  };
}

async function listUncached(): Promise<VacationDestinationItem[]> {
  const base: VacationDestinationItem[] = builtIn.map((destination) => ({
    ...destination,
    ownerAdded: false,
    edited: false,
    photos: [],
  }));
  if (!DB_ENABLED) return base;

  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = (await prisma.vacationDestination.findMany({
      include: {
        // Only pictures that may be shown. lib/photos.ts holds a picture back
        // to draft until somebody says whose it is, and a draft is not a
        // decision to publish later — it is a decision not to publish now.
        photos: {
          where: { status: "PUBLISHED" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, url: true, caption: true, credit: true },
        },
      },
    })) as unknown as Row[];

    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    const merged: VacationDestinationItem[] = [];

    for (const destination of builtIn) {
      const row = bySlug.get(destination.slug);
      if (!row) {
        merged.push({ ...destination, ownerAdded: false, edited: false, photos: [] });
        continue;
      }
      bySlug.delete(destination.slug);
      // HIDDEN IS HOW A SHIPPED DESTINATION COMES OFF THE SITE. Deleting the
      // row would only restore the built-in text; the owner needs a way to
      // retire one without waiting for a deploy.
      if (row.status !== "PUBLISHED") continue;
      merged.push(overlay(destination, row));
    }

    for (const row of bySlug.values()) {
      if (row.status !== "PUBLISHED") continue;
      merged.push(overlay(undefined, row));
    }

    return merged;
  } catch {
    return base;
  }
}

/** Every destination a visitor may see, built-in and owner-written. */
export async function getVacationDestinations(): Promise<VacationDestinationItem[]> {
  return cachedRead(listUncached, ["vacation-destinations"], [VACATION_DESTINATIONS_TAG]);
}

export async function getVacationDestinationBySlug(slug: string): Promise<VacationDestinationItem | undefined> {
  return (await getVacationDestinations()).find((destination) => destination.slug === slug);
}

/**
 * Every destination INCLUDING hidden ones, with its row, for the admin.
 *
 * The public reader drops what is hidden, which is right for a visitor and
 * useless for the person who hid it — a destination that vanishes from the
 * screen that manages it cannot be brought back.
 */
export async function listVacationDestinationsForAdmin(): Promise<
  { destination: VacationDestinationItem; hidden: boolean; hasRow: boolean }[]
> {
  const rows: Row[] = DB_ENABLED
    ? await (async () => {
        try {
          const { prisma } = await import("@/lib/prisma");
          return (await prisma.vacationDestination.findMany({
            include: {
              photos: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                select: { id: true, url: true, caption: true, credit: true },
              },
            },
          })) as unknown as Row[];
        } catch {
          return [];
        }
      })()
    : [];

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const out: { destination: VacationDestinationItem; hidden: boolean; hasRow: boolean }[] = [];

  for (const destination of builtIn) {
    const row = bySlug.get(destination.slug);
    if (row) bySlug.delete(destination.slug);
    out.push({
      destination: row ? overlay(destination, row) : { ...destination, ownerAdded: false, edited: false, photos: [] },
      hidden: row ? row.status !== "PUBLISHED" : false,
      hasRow: Boolean(row),
    });
  }

  for (const row of bySlug.values()) {
    out.push({ destination: overlay(undefined, row), hidden: row.status !== "PUBLISHED", hasRow: true });
  }

  return out.sort((a, b) => a.destination.name.localeCompare(b.destination.name));
}
