/**
 * Isolated source-pack schema for the second worldwide content batch.
 *
 * This intentionally models the private import-review layer rather than any
 * public page. The centralized importer can map the fields directly to its
 * ContentImportCandidate input while preserving source provenance and a
 * deterministic duplicate key.
 */

export const WORLDWIDE_BATCH_2_SCHEMA_VERSION = 1 as const;

export type SourceType =
  | "official_attraction"
  | "official_community"
  | "official_kosher_certifier"
  | "official_municipal"
  | "official_museum"
  | "official_tourism";

export type CandidateEntityType =
  | "vacation_destination"
  | "attraction"
  | "stay_anchor"
  | "kosher_travel_resource";

/**
 * Mirrors the currently staged ContentImportKind values. A vacation
 * destination is staged as PRACTICAL until the centralized importer adds its
 * destination-specific adapter.
 */
export type ImportKind = "ATTRACTION" | "PLACE_TO_STAY" | "PRACTICAL";

export type ImportTarget =
  | "VacationDestination"
  | "Attraction"
  | "KosherArea"
  | "PracticalPlace";

/**
 * This matches the central import review workflow. No entry in this source
 * pack is eligible to become public content automatically.
 */
export type PublicationReadiness = "NEEDS_REVIEW" | "PUBLISHED";

export type SourceDefinition = {
  name: string;
  url: string;
  type: SourceType;
  /** The organization or operator to credit in the import trail. */
  attribution: string;
  /** What the cited first-party page establishes for this group of records. */
  evidence: string;
  lastChecked: string;
};

export type CandidateInput = {
  market: string;
  entityType: CandidateEntityType;
  importKind: ImportKind;
  importTarget: ImportTarget;
  category: string;
  slug: string;
  name: string;
  aliases: readonly string[];
  keywords: readonly string[];
  locality: string;
  destination: string;
  country: string;
  sourceKey: string;
  /**
   * Kept explicit even for draft-only entries so the importer cannot silently
   * change their editorial status.
   */
  publicationReadiness: PublicationReadiness;
  requiredBeforePublication: readonly string[];
};

export type WorldwideCandidate = Omit<CandidateInput, "sourceKey"> & {
  schemaVersion: typeof WORLDWIDE_BATCH_2_SCHEMA_VERSION;
  /** Stable external identifier; this is also the central import sourceId. */
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

export function makeCandidateId(input: Pick<CandidateInput, "market" | "entityType" | "slug">): string {
  return `wgb2-${input.market}-${input.entityType.replace(/_/g, "-")}-${input.slug}`;
}

export function sourceBackedCandidate(
  sources: Readonly<Record<string, SourceDefinition>>,
  input: CandidateInput,
): WorldwideCandidate {
  const source = sources[input.sourceKey];
  if (!source) {
    throw new Error(`Unknown source key "${input.sourceKey}" for ${input.slug}`);
  }

  const id = makeCandidateId(input);
  return {
    ...input,
    schemaVersion: WORLDWIDE_BATCH_2_SCHEMA_VERSION,
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
