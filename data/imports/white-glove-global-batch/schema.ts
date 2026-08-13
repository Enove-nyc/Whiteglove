/**
 * Portable private-review contract for the White Glove global editorial pack.
 *
 * This file deliberately describes candidate evidence, not public listings.
 * Nothing in the package contains a publication flag, coordinates, contact
 * information, rates, opening times, review text, or booking availability.
 */

export const WHITE_GLOVE_GLOBAL_BATCH_SCHEMA_VERSION = 1 as const;

export type SourceType =
  | "official_attraction"
  | "official_community"
  | "official_kosher_certifier"
  | "official_municipal"
  | "official_museum"
  | "official_tourism"
  | "official_transit";

export type CandidateEntityType =
  | "vacation_destination"
  | "attraction"
  | "stay_anchor"
  | "practical_travel_resource"
  | "kosher_travel_resource";

export type ImportKind = "ATTRACTION" | "PLACE_TO_STAY" | "PRACTICAL";

export type ImportTarget = "VacationDestination" | "Attraction" | "KosherArea" | "PracticalPlace";

/** Source-pack rows can only enter the private review queue. */
export type PublicationReadiness = "NEEDS_REVIEW";

export type SourceDefinition = {
  name: string;
  url: string;
  type: SourceType;
  /** Organization retained in the private import trail. */
  attribution: string;
  /** Narrow description of what this source establishes for its candidates. */
  evidence: string;
  lastChecked: string;
};

export type CandidateInput = {
  market: string;
  entityType: CandidateEntityType;
  importKind: ImportKind;
  importTarget: ImportTarget;
  category: string;
  /** Owner-facing label when a row was tagged for review (shul, attraction, …). */
  listingLabel?: string;
  slug: string;
  name: string;
  /**
   * Canonical names only. A duplicate of the displayed name is intentional
   * when no reliable alternate-language or shortened form was researched.
   */
  aliases: readonly string[];
  /** Discovery terms limited to location and a conservative editorial category. */
  keywords: readonly string[];
  locality: string;
  destination: string;
  country: string;
  sourceKey: string;
  publicationReadiness: PublicationReadiness;
  /** Editorial gates that must pass before a public listing can exist. */
  requiredBeforePublication: readonly string[];
};

export type WhiteGloveGlobalCandidate = Omit<CandidateInput, "sourceKey"> & {
  schemaVersion: typeof WHITE_GLOVE_GLOBAL_BATCH_SCHEMA_VERSION;
  /** Stable external identity, also suitable for a centralized import sourceId. */
  id: string;
  sourceId: string;
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  sourceAttribution: string;
  sourceEvidence: string;
  sourceLastChecked: string;
  normalizedName: string;
  normalizedLocation: string;
  dedupeKey: string;
};

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizedLocation(locality: string, country: string): string {
  return `${normalizeText(locality)}, ${normalizeText(country)}`;
}

export function duplicateKey(
  entityType: CandidateEntityType,
  name: string,
  locality: string,
  country: string,
): string {
  return [entityType, normalizeText(name), normalizedLocation(locality, country)].join("::");
}

/**
 * Cross-kind duplicate comparison prevents a practical resource from being
 * staged under the name of a current attraction or certifier.
 */
export function nameLocationKey(name: string, locality: string, country: string): string {
  return [normalizeText(name), normalizedLocation(locality, country)].join("::");
}

export function nameKey(name: string): string {
  return normalizeText(name);
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

export function makeCandidateId(input: Pick<CandidateInput, "market" | "entityType" | "slug">): string {
  return `wggb-${slugify(input.market)}-${input.entityType.replace(/_/g, "-")}-${slugify(input.slug)}`;
}

export function sourceBackedCandidate(
  sources: Readonly<Record<string, SourceDefinition>>,
  input: CandidateInput,
): WhiteGloveGlobalCandidate {
  const source = sources[input.sourceKey];
  if (!source) {
    throw new Error(`Unknown source key "${input.sourceKey}" for ${input.slug}`);
  }

  const id = makeCandidateId(input);
  return {
    ...input,
    schemaVersion: WHITE_GLOVE_GLOBAL_BATCH_SCHEMA_VERSION,
    id,
    sourceId: id,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceType: source.type,
    sourceAttribution: source.attribution,
    sourceEvidence: source.evidence,
    sourceLastChecked: source.lastChecked,
    normalizedName: normalizeText(input.name),
    normalizedLocation: normalizedLocation(input.locality, input.country),
    dedupeKey: duplicateKey(input.entityType, input.name, input.locality, input.country),
  };
}
