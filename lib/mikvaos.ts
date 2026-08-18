/**
 * Published mikvah listings for the public site and admin overview.
 *
 * Data lives on PracticalPlace with category MIKVAH — same model as minyanim
 * and other practical travel listings. Public surfaces only show PUBLISHED
 * rows with an allowed source URL (or the static seed catalog that already
 * carries a source on each entry).
 */

import { cemeteries } from "@/data/cemeteries";
import { practicalContent } from "@/data/practical-content";
import { destinations as heritageDestinations, destinationHref as heritageDestinationHref } from "@/data/destinations";
import { getBulkDestination } from "@/data/destinations-bulk";
import { isDisallowedImportSource } from "@/lib/bulk-content";
import { cachedRead } from "@/lib/cache-tags";
import { heritageTownHref } from "@/lib/route-migration";
import { vacationDestinations, type VacationDestination } from "@/data/vacation-destinations";
import { destinationHref as vacationHref } from "@/lib/vacation-ideas";

/**
 * Busted by every PracticalPlace write, of any category, not only MIKVAH —
 * createPlace/updatePlace/deletePlace (lib/content-admin.ts, the shared
 * editor behind every practical-listing category), the bulk-import publish
 * step (lib/content-imports.ts, which writes PracticalPlace directly rather
 * than through those functions), and the bulk re-import (lib/db-setup.ts).
 * A slightly wider tag than listPublishedMikvaos strictly needs — busting it
 * on an unrelated category's edit is a harmless extra cache miss, and it is
 * the only tag any future PracticalPlace-reading page needs to reuse rather
 * than inventing its own.
 */
export const PRACTICAL_PLACES_PUBLIC_TAG = "practical-places-public";

export type MikvahListing = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  hours: string | null;
  notes: string | null;
  website: string | null;
  sourceUrl: string;
  coordinates: string | null;
  city: string;
  country: string;
  destinationSlug: string;
  href: string;
  /** True when the row came from the live database rather than the seed catalog. */
  fromDatabase: boolean;
  status?: "PUBLISHED" | "DRAFT" | "NEEDS_REVIEW";
};

function isAllowedSource(sourceUrl: string | null | undefined): boolean {
  if (!sourceUrl?.trim()) return false;
  return !isDisallowedImportSource({
    sourceUrl,
    sourceName: "",
    attribution: "",
  });
}

/**
 * Which page a listing's town links to.
 *
 * `known` is the merged destination list when the caller has read it. It
 * defaults to the built-in list so a synchronous caller still resolves the
 * twenty shipped destinations; pass the merged one and a destination the owner
 * added links to itself rather than falling through to a heritage town.
 */
function destinationHrefFor(
  slug: string,
  city: string,
  known: readonly VacationDestination[] = vacationDestinations,
): string {
  const vacation = known.find((item) => item.slug === slug || item.cities.includes(city));
  if (vacation) return vacationHref(vacation);
  const heritage = heritageDestinations.find((item) => item.slug === slug);
  if (heritage) return heritageDestinationHref(heritage);
  if (getBulkDestination(slug)) return heritageTownHref(slug);
  return heritageTownHref(slug) || `/stops`;
}

/** Static, source-backed mikvah entries shipped in the repo. */
export function staticMikvahListings(known: readonly VacationDestination[] = vacationDestinations): MikvahListing[] {
  const out: MikvahListing[] = [];

  for (const [slug, content] of Object.entries(practicalContent)) {
    for (const [index, place] of (content.places ?? []).entries()) {
      if (place.category !== "MIKVAH") continue;
      const sourceUrl = place.source?.trim();
      if (!sourceUrl || !isAllowedSource(sourceUrl)) continue;
      const bulk = getBulkDestination(slug);
      const heritage = heritageDestinations.find((item) => item.slug === slug);
      const city = bulk?.city ?? heritage?.city ?? slug;
      const country = bulk?.country ?? heritage?.country ?? "";
      out.push({
        id: `static-practical-${slug}-${index}`,
        name: place.name,
        address: place.address ?? null,
        phone: place.phone ?? null,
        hours: place.hours ?? null,
        notes: place.notes ?? null,
        website: place.website ?? null,
        sourceUrl,
        coordinates: place.coordinates ?? null,
        city,
        country,
        destinationSlug: slug,
        href: destinationHrefFor(slug, city, known),
        fromDatabase: false,
      });
    }
  }

  for (const cemetery of cemeteries) {
    for (const [index, place] of (cemetery.places ?? []).entries()) {
      if (place.category !== "MIKVAH") continue;
      const sourceUrl = (place.source ?? cemetery.sourceUrl)?.trim();
      if (!sourceUrl || !isAllowedSource(sourceUrl)) continue;
      out.push({
        id: `static-cemetery-${cemetery.slug}-${index}`,
        name: place.name,
        address: place.address ?? null,
        phone: place.phone ?? null,
        hours: place.hours ?? null,
        notes: place.notes ?? null,
        website: place.website ?? null,
        sourceUrl,
        coordinates: place.coordinates ?? null,
        city: cemetery.city,
        country: cemetery.country,
        destinationSlug: cemetery.slug,
        href: `/cemeteries/${cemetery.slug}`,
        fromDatabase: false,
      });
    }
  }

  return dedupeByNameCity(out).sort(byCountryCityName);
}

function byCountryCityName(a: MikvahListing, b: MikvahListing): number {
  return a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
}

function dedupeByNameCity(listings: MikvahListing[]): MikvahListing[] {
  const seen = new Set<string>();
  const out: MikvahListing[] = [];
  for (const listing of listings) {
    const key = `${listing.name.toLocaleLowerCase("en")}|${listing.city.toLocaleLowerCase("en")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(listing);
  }
  return out;
}

type DbMikvahRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  hours: string | null;
  notes: string | null;
  website: string | null;
  sourceUrl: string | null;
  coordinates: string | null;
  status: "PUBLISHED" | "DRAFT" | "NEEDS_REVIEW";
  destination: { slug: string; city: string; country: string };
};

/** Pure mapper — exported for tests. */
export function mikvahListingFromDbRow(row: DbMikvahRow, known: readonly VacationDestination[] = vacationDestinations): MikvahListing | null {
  if (row.status !== "PUBLISHED") return null;
  if (!isAllowedSource(row.sourceUrl)) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    hours: row.hours,
    notes: row.notes,
    website: row.website,
    sourceUrl: row.sourceUrl!,
    coordinates: row.coordinates,
    city: row.destination.city,
    country: row.destination.country,
    destinationSlug: row.destination.slug,
    href: destinationHrefFor(row.destination.slug, row.destination.city, known),
    fromDatabase: true,
    status: row.status,
  };
}

async function listPublishedMikvaosUncached(): Promise<MikvahListing[]> {
  // Read once and handed down, so every href on this list points at the
  // destination page the owner's own list says exists.
  const { getVacationDestinations } = await import("@/lib/vacation-destinations-view");
  const known = await getVacationDestinations();
  if (!process.env.DATABASE_URL) return staticMikvahListings(known);
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.practicalPlace.findMany({
      where: { category: "MIKVAH", status: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        hours: true,
        notes: true,
        website: true,
        sourceUrl: true,
        coordinates: true,
        status: true,
        destination: { select: { slug: true, city: true, country: true } },
      },
      orderBy: [{ destination: { country: "asc" } }, { destination: { city: "asc" } }, { name: "asc" }],
    });
    // Wrapped rather than passed by name: .map hands the callback an index as
    // its second argument, which is not a destination list.
    const published = rows.map((row) => mikvahListingFromDbRow(row, known)).filter((row): row is MikvahListing => Boolean(row));
    if (published.length > 0) return published;
  } catch (error) {
    console.error("[mikvaos] DB read failed — using static catalog", error);
  }
  return staticMikvahListings(known);
}

/**
 * Public mikvaos: published DB rows when available, otherwise the static
 * source-backed catalog. Never mixes drafts into the public list.
 *
 * Cached and tagged rather than read fresh on /mikvaos's every visit — see
 * PRACTICAL_PLACES_PUBLIC_TAG for every write path that busts it. Goes
 * through lib/cache-tags.ts's cachedRead rather than importing
 * `unstable_cache` directly — see that file for why.
 */
export async function listPublishedMikvaos(): Promise<MikvahListing[]> {
  return cachedRead(listPublishedMikvaosUncached, ["published-mikvaos"], [PRACTICAL_PLACES_PUBLIC_TAG]);
}

/** Admin overview: every MIKVAH row including drafts that still need work. */
export async function listMikvaosForAdmin(): Promise<
  Array<MikvahListing & { status: "PUBLISHED" | "DRAFT" | "NEEDS_REVIEW"; verification: string }>
> {
  const { getVacationDestinations } = await import("@/lib/vacation-destinations-view");
  const known = await getVacationDestinations();
  if (!process.env.DATABASE_URL) {
    return staticMikvahListings(known).map((listing) => ({
      ...listing,
      status: "PUBLISHED" as const,
      verification: "NEEDS_VERIFICATION",
    }));
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.practicalPlace.findMany({
      where: { category: "MIKVAH" },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        hours: true,
        notes: true,
        website: true,
        sourceUrl: true,
        coordinates: true,
        status: true,
        verification: true,
        destination: { select: { slug: true, city: true, country: true } },
      },
      orderBy: [{ status: "asc" }, { destination: { country: "asc" } }, { destination: { city: "asc" } }, { name: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      hours: row.hours,
      notes: row.notes,
      website: row.website,
      sourceUrl: row.sourceUrl ?? "",
      coordinates: row.coordinates,
      city: row.destination.city,
      country: row.destination.country,
      destinationSlug: row.destination.slug,
      href: destinationHrefFor(row.destination.slug, row.destination.city, known),
      fromDatabase: true,
      status: row.status,
      verification: row.verification,
    }));
  } catch (error) {
    console.error("[mikvaos] admin list failed", error);
    return [];
  }
}

/** Published mikvaos whose destination cities match a vacation destination. */
export async function publishedMikvaosForCities(cities: readonly string[]): Promise<MikvahListing[]> {
  const wanted = new Set(cities.map((city) => city.toLocaleLowerCase("en")));
  const all = await listPublishedMikvaos();
  return all.filter((listing) => wanted.has(listing.city.toLocaleLowerCase("en")));
}
