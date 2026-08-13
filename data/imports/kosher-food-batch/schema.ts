/**
 * Private NEEDS_REVIEW pack for kosher food finder leads.
 *
 * These rows are community / certifier directory listings already sourced on
 * this site (cemetery practical notes, Chabad food directories, kehilla pages).
 * Staging puts them in Needs review. Nothing here publishes a public kosher
 * claim — bulk import cannot, and this pack does not try.
 */

export const KOSHER_FOOD_BATCH_SCHEMA_VERSION = 1 as const;

export type SourceType = "official_community" | "official_kosher_certifier";

export type CandidateEntityType = "kosher_food_listing";

export type ImportKind = "KOSHER_FOOD";

export type FoodCategory = "Restaurant" | "Bakery" | "Butcher" | "Grocery" | "Takeaway" | "Cafe";

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
  category: FoodCategory;
  listingLabel: "Kosher food";
  slug: string;
  name: string;
  aliases: readonly string[];
  keywords: readonly string[];
  locality: string;
  destination: string;
  country: string;
  address: string;
  summary: string;
  website?: string | null;
  kosherClaim: "reported";
  kosherSourceUrl: string;
  sourceKey: string;
  publicationReadiness: PublicationReadiness;
  requiredBeforePublication: readonly string[];
};

export type KosherFoodCandidate = Omit<CandidateInput, "sourceKey"> & {
  schemaVersion: typeof KOSHER_FOOD_BATCH_SCHEMA_VERSION;
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

export function duplicateKey(entityType: CandidateEntityType, name: string, locality: string, country: string): string {
  return [entityType, normalizeText(name), normalizedLocation(locality, country)].join("::");
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

export function makeCandidateId(input: Pick<CandidateInput, "market" | "entityType" | "slug">): string {
  return `wgkf-${slugify(input.market)}-${input.entityType.replace(/_/g, "-")}-${slugify(input.slug)}`;
}

export const KOSHER_FOOD_REVIEW_GATES = [
  "Confirm current hechsher or community listing against the cited source",
  "Confirm it is kosher — not kosher-style, Israeli-style, or a Jewish-themed restaurant without kashrus",
  "Address and whether meals need booking verified before any public listing",
] as const;

export function sourceBackedCandidate(
  sources: Readonly<Record<string, SourceDefinition>>,
  input: CandidateInput,
): KosherFoodCandidate {
  const source = sources[input.sourceKey];
  if (!source) throw new Error(`Unknown source key "${input.sourceKey}" for ${input.slug}`);
  const id = makeCandidateId(input);
  return {
    ...input,
    schemaVersion: KOSHER_FOOD_BATCH_SCHEMA_VERSION,
    id,
    sourceId: id,
    sourceKey: input.sourceKey,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceType: source.type,
    sourceAttribution: source.attribution,
    sourceEvidence: source.evidence,
    sourceLastChecked: source.lastChecked,
    kosherSourceUrl: input.kosherSourceUrl || source.url,
    normalizedName: normalizeText(input.name),
    normalizedLocation: normalizedLocation(input.locality, input.country),
    dedupeKey: duplicateKey(input.entityType, input.name, input.locality, input.country),
  };
}
