/**
 * Read-side helpers for the Chabad Travel Directory — Europe (/chabad-europe).
 *
 * A thin layer over data/chabad-europe.ts: nothing here reaches a database,
 * because this directory has no admin editor yet — see that file's header
 * for why (chabad.org's locator is unreachable by this project's fetch
 * tools) and for the rule an entry has to meet before it is added.
 */

import { chabadEuropeListings, type ChabadEuropeListing, type ChabadFeatureStatus } from "@/data/chabad-europe";

export type { ChabadEuropeListing, ChabadFeatureStatus };

export const CHABAD_FEATURE_KEYS = ["minyan", "mikveh", "kosher_food", "shabbat_hospitality"] as const;
export type ChabadFeatureKey = (typeof CHABAD_FEATURE_KEYS)[number];

export const CHABAD_FEATURE_LABELS: Record<ChabadFeatureKey, string> = {
  minyan: "Minyan",
  mikveh: "Mikveh",
  kosher_food: "Kosher food",
  shabbat_hospitality: "Shabbat hospitality",
};

export const CHABAD_STATUS_LABELS: Record<ChabadFeatureStatus, string> = {
  confirmed: "Confirmed",
  not_confirmed: "Not confirmed",
  unavailable: "Not available",
  seasonal_or_holiday_only: "Seasonal / holiday only",
  contact_to_confirm: "Contact to confirm",
};

function statusOf(listing: ChabadEuropeListing, feature: ChabadFeatureKey): ChabadFeatureStatus {
  switch (feature) {
    case "minyan":
      return listing.minyan_status;
    case "mikveh":
      return listing.mikveh_status;
    case "kosher_food":
      return listing.kosher_food_status;
    case "shabbat_hospitality":
      return listing.shabbat_hospitality_status;
  }
}

function notesOf(listing: ChabadEuropeListing, feature: ChabadFeatureKey): string | null {
  switch (feature) {
    case "minyan":
      return listing.minyan_notes;
    case "mikveh":
      return listing.mikveh_notes;
    case "kosher_food":
      return listing.kosher_food_notes;
    case "shabbat_hospitality":
      return listing.shabbat_hospitality_notes;
  }
}

export type ChabadFeatureView = {
  key: ChabadFeatureKey;
  label: string;
  status: ChabadFeatureStatus;
  statusLabel: string;
  notes: string | null;
  sourceUrl: string | null;
};

/** Every feature on a listing, paired with its status, notes and citation. */
export function featuresOf(listing: ChabadEuropeListing): ChabadFeatureView[] {
  return CHABAD_FEATURE_KEYS.map((key) => ({
    key,
    label: CHABAD_FEATURE_LABELS[key],
    status: statusOf(listing, key),
    statusLabel: CHABAD_STATUS_LABELS[statusOf(listing, key)],
    notes: notesOf(listing, key),
    sourceUrl: listing.feature_source_urls[key] ?? null,
  }));
}

/** Only the features a listing's own source actually confirms — what a card shows. */
export function confirmedFeaturesOf(listing: ChabadEuropeListing): ChabadFeatureView[] {
  return featuresOf(listing).filter((feature) => feature.status === "confirmed");
}

/** All published entries, sorted by country then city then name. */
export function listChabadEuropeListings(): ChabadEuropeListing[] {
  return [...chabadEuropeListings].sort(
    (a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name),
  );
}

/** Every country represented, for the filter control. */
export function chabadEuropeCountries(listings: readonly ChabadEuropeListing[]): string[] {
  return [...new Set(listings.map((listing) => listing.country))].sort((a, b) => a.localeCompare(b));
}
