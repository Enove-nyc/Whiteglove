/**
 * Private fill-pack schema for closing the remaining editorial-review count gap.
 * Isolated from public data; status is always NEEDS_REVIEW.
 */

export const WHITE_GLOVE_FILL_BATCH_SCHEMA_VERSION = 1 as const;

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
export type PublicationReadiness = "NEEDS_REVIEW";

export type SourceDefinition = {
  name: string;
  url: string;
  type: SourceType;
  attribution: string;
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
  publicationReadiness: PublicationReadiness;
  requiredBeforePublication: readonly string[];
};

export type WhiteGloveFillCandidate = Omit<CandidateInput, "sourceKey"> & {
  schemaVersion: typeof WHITE_GLOVE_FILL_BATCH_SCHEMA_VERSION;
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

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

export function makeCandidateId(input: Pick<CandidateInput, "market" | "entityType" | "slug">): string {
  return `wgfb-${slugify(input.market)}-${input.entityType.replace(/_/g, "-")}-${slugify(input.slug)}`;
}

export function sourceBackedCandidate(
  sources: Readonly<Record<string, SourceDefinition>>,
  input: CandidateInput,
): WhiteGloveFillCandidate {
  const source = sources[input.sourceKey];
  if (!source) throw new Error(`Unknown source key "${input.sourceKey}" for ${input.slug}`);
  const id = makeCandidateId(input);
  return {
    ...input,
    schemaVersion: WHITE_GLOVE_FILL_BATCH_SCHEMA_VERSION,
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
