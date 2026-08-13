/**
 * Private NEEDS_REVIEW pack for Nesiya Tova batei chayim, shomer phones,
 * mikvaos and hachnasas orchim. Nothing here publishes.
 */

export const NESIYATOVA_HERITAGE_SCHEMA_VERSION = 1 as const;

export type SourceType = "heritage_directory";

export type CandidateEntityType = "beis_hachaim" | "mikvah" | "hachnasas_orchim";

export type ImportKind = "ATTRACTION" | "PRACTICAL";

export type ListingLabel = "Beis hachaim" | "Mikvah" | "Hachnasas orchim";

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
  category: string;
  listingLabel: ListingLabel;
  slug: string;
  name: string;
  aliases: readonly string[];
  keywords: readonly string[];
  locality: string;
  destination: string;
  country: string;
  address: string;
  summary: string;
  coordinates?: string | null;
  website?: string | null;
  /** Per-listing Nesiya Tova page — not the homepage standing in for every row. */
  listingSourceUrl: string;
  /** Digits copied from Nesiya Tova contact fields only. Empty if none were listed. */
  phones: readonly string[];
  nesiyatovaMkmId: number;
  sourceKey: string;
  publicationReadiness: PublicationReadiness;
  requiredBeforePublication: readonly string[];
};

export type NesiyatovaHeritageCandidate = Omit<CandidateInput, "sourceKey"> & {
  schemaVersion: typeof NESIYATOVA_HERITAGE_SCHEMA_VERSION;
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

export type CandidateDraftRow = Omit<
  CandidateInput,
  "publicationReadiness" | "requiredBeforePublication" | "sourceKey"
> & {
  sourceKey: string;
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
  const slug = normalizeText(value).replace(/\s+/g, "-");
  return slug || "listing";
}

export function makeCandidateId(input: Pick<CandidateInput, "entityType" | "slug">): string {
  return `wgnt-${input.entityType.replace(/_/g, "-")}-${slugify(input.slug)}`;
}

export const NESIYATOVA_REVIEW_GATES = [
  "Confirm the listing against the cited Nesiya Tova page before any public use",
  "Confirm phones by ringing — do not publish a number that has not been checked",
  "Beis hachaim / kevarim are published from the kevarim admin, not this import queue",
] as const;

export function sourceBackedCandidate(
  sources: Readonly<Record<string, SourceDefinition>>,
  input: CandidateInput,
): NesiyatovaHeritageCandidate {
  const source = sources[input.sourceKey];
  if (!source) throw new Error(`Unknown source key "${input.sourceKey}" for ${input.slug}`);
  const id = makeCandidateId(input);
  const phones = input.phones.filter((phone) => phone.trim());
  const evidence = phones.length
    ? `Contact numbers as listed on Nesiya Tova (verify before publishing): ${phones.join("; ")}`
    : source.evidence;
  return {
    ...input,
    phones,
    schemaVersion: NESIYATOVA_HERITAGE_SCHEMA_VERSION,
    id,
    sourceId: id,
    sourceKey: input.sourceKey,
    sourceName: source.name,
    sourceUrl: input.listingSourceUrl,
    sourceType: source.type,
    sourceAttribution: source.attribution,
    sourceEvidence: evidence,
    sourceLastChecked: source.lastChecked,
    normalizedName: normalizeText(input.name),
    normalizedLocation: normalizedLocation(input.locality, input.country),
    dedupeKey: duplicateKey(input.entityType, input.name, input.locality, input.country),
  };
}
