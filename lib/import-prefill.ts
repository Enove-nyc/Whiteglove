/**
 * Prefill import candidates so review is verify-and-publish, not blank forms.
 *
 * Uses pack fields first, then known public place data already on the site
 * (attractions, stays, cemeteries, destinations). Never invents hours, prices,
 * or kosher claims. Rows stay NEEDS_REVIEW until the owner publishes.
 */

import { attractions } from "@/data/attractions";
import { destinations } from "@/data/destinations";
import {
  listingCategoryLabel,
  normalizeListingCategory,
} from "@/data/listing-categories";
import { kosherStays } from "@/data/kosher-stays";
import { cemeteries } from "@/data/cemeteries";
import { normalizeContentText, type BulkContentCandidateInput, type BulkContentKind } from "@/lib/bulk-content";

export type PrefillablePackFields = {
  category?: string | null;
  name: string;
  aliases?: readonly string[];
  city?: string | null;
  locality?: string | null;
  destination?: string | null;
  country: string;
  sourceUrl: string;
  sourceId: string;
  sourceName: string;
  sourceAttribution?: string;
  attribution?: string;
  sourceEvidence?: unknown;
  sourceRights?: string | null;
  license?: string | null;
  /** Optional fields newer packs may already carry. */
  summary?: string | null;
  address?: string | null;
  coordinates?: string | null;
  website?: string | null;
  destinationSlug?: string | null;
  keywords?: readonly string[];
  kosherClaim?: string | null;
  kosherSourceUrl?: string | null;
};

type KnownPlace = {
  name: string;
  city: string;
  country: string;
  address?: string;
  coordinates?: string;
  website?: string;
  summary?: string;
};

function placeKey(name: string, city: string): string {
  return `${normalizeContentText(name)}|${normalizeContentText(city)}`;
}

const KNOWN_PLACES: Map<string, KnownPlace> = (() => {
  const map = new Map<string, KnownPlace>();
  const add = (place: KnownPlace) => {
    const key = placeKey(place.name, place.city);
    if (!map.has(key)) map.set(key, place);
  };
  for (const attraction of attractions) {
    add({
      name: attraction.name,
      city: attraction.city,
      country: attraction.country,
      address: attraction.address,
      coordinates: attraction.coordinates,
      website: attraction.website,
      summary: attraction.summary,
    });
  }
  for (const stay of kosherStays) {
    add({
      name: stay.name,
      city: stay.city,
      country: stay.country,
      website: stay.website,
      summary: stay.summary,
    });
  }
  for (const cemetery of cemeteries) {
    add({
      name: cemetery.name,
      city: cemetery.city,
      country: cemetery.country,
      address: cemetery.address,
      coordinates: cemetery.coordinates,
      summary: cemetery.accessNote,
    });
  }
  return map;
})();

const DESTINATION_BY_CITY = (() => {
  const map = new Map<string, string>();
  for (const destination of destinations) {
    map.set(normalizeContentText(destination.city), destination.slug);
    map.set(normalizeContentText(destination.slug.replace(/-/g, " ")), destination.slug);
  }
  return map;
})();

function draftSummary(input: {
  name: string;
  city: string;
  country: string;
  category: string | null;
  keywords?: readonly string[];
  knownSummary?: string;
}): string {
  if (input.knownSummary?.trim()) return input.knownSummary.trim();
  const categoryLabel = listingCategoryLabel(input.category) || input.category || "listing";
  const keywordHint = (input.keywords ?? [])
    .map((word) => word.trim())
    .filter((word) => word && !normalizeContentText(word).includes(normalizeContentText(input.city)))
    .slice(0, 3)
    .join(", ");
  const base = `${input.name} in ${input.city}, ${input.country} — ${categoryLabel.toLocaleLowerCase("en")} for trip planning.`;
  if (!keywordHint) {
    return `${base} Confirm visit details against the cited source before publishing.`;
  }
  return `${base} Related: ${keywordHint}. Confirm visit details against the cited source before publishing.`;
}

function resolveDestinationSlug(destination: string | null | undefined, city: string): string | null {
  const fromField = destination?.trim();
  if (fromField) {
    const byName = DESTINATION_BY_CITY.get(normalizeContentText(fromField));
    if (byName) return byName;
    const slugish = normalizeContentText(fromField).replace(/\s+/g, "-");
    if (destinations.some((item) => item.slug === slugish)) return slugish;
  }
  return DESTINATION_BY_CITY.get(normalizeContentText(city)) ?? null;
}

/**
 * Build a BulkContentCandidateInput with every field we can honestly prefill.
 * Does not mark the row published — staging still leaves it NEEDS_REVIEW.
 */
export function prefillBulkCandidateFromPack(
  pack: PrefillablePackFields,
  kind: BulkContentKind | string,
  licenseFallback: string,
): BulkContentCandidateInput {
  const city = (pack.city ?? pack.locality ?? "").trim();
  const country = pack.country.trim();
  const name = pack.name.trim();
  const category = normalizeListingCategory(pack.category);
  const known = KNOWN_PLACES.get(placeKey(name, city));
  const destinationSlug =
    pack.destinationSlug?.trim() || resolveDestinationSlug(pack.destination, city) || null;

  const summary =
    pack.summary?.trim() ||
    draftSummary({
      name,
      city,
      country,
      category,
      keywords: pack.keywords,
      knownSummary: known?.summary,
    });

  const address = pack.address?.trim() || known?.address || null;
  const coordinates = pack.coordinates?.trim() || known?.coordinates || null;
  // Prefer an official place website when the site already has one; otherwise
  // leave blank rather than treating a tourism-index source URL as the place site.
  const website = pack.website?.trim() || known?.website || null;

  return {
    kind: kind as BulkContentKind,
    category,
    name,
    aliases: [...(pack.aliases ?? [])],
    city,
    region: pack.destination?.trim() || null,
    country,
    destinationSlug,
    address,
    coordinates,
    website,
    summary,
    sourceUrl: pack.sourceUrl,
    sourceId: pack.sourceId,
    sourceName: pack.sourceName,
    attribution: (pack.attribution ?? pack.sourceAttribution ?? "").trim(),
    license: pack.license?.trim() || pack.sourceRights?.trim() || licenseFallback,
    sourceEvidence: pack.sourceEvidence,
    kosherClaim: pack.kosherClaim?.trim() || null,
    kosherSourceUrl: pack.kosherSourceUrl?.trim() || null,
  };
}
