/**
 * Private source-pack contract for White Glove's Europe / Mediterranean /
 * Middle East editorial research batch.
 *
 * This intentionally lives outside the public data model and does not register
 * an importer. Its fields map to ContentImportCandidate where applicable, but
 * customer-facing copy, locations, coordinates, availability and publishing
 * decisions are deliberately absent.
 */

export const WHITE_GLOVE_EUROPE_SCHEMA_VERSION = 1 as const;

export type SourceType =
  | "official_attraction"
  | "official_community"
  | "official_kosher_certifier"
  | "official_municipal"
  | "official_museum"
  | "official_tourism"
  | "official_transport";

export type CandidateEntityType =
  | "vacation_destination"
  | "attraction"
  | "practical_travel_anchor"
  | "kosher_travel_resource";

/**
 * These are the values accepted by the current ContentImportCandidate model.
 * A destination is held as PRACTICAL until a destination-specific review
 * adapter exists; it cannot become public from this package.
 */
export type ImportKind = "ATTRACTION" | "PRACTICAL";

export type ImportTarget = "VacationDestination" | "Attraction" | "PracticalPlace";

export type PrivateReviewStatus = "NEEDS_REVIEW";

export type SourceDefinition = {
  name: string;
  url: string;
  type: SourceType;
  /** Organization that owns or operates the cited source. */
  attribution: string;
  /** Narrow statement of what the source establishes for these candidates. */
  evidence: string;
  /**
   * This pack uses sources as factual research links only. It stores no
   * source text, imagery, map data, reviews, availability, prices or contacts.
   */
  rights: string;
  lastChecked: string;
};

export type CandidateInput = {
  market: string;
  entityType: CandidateEntityType;
  kind: ImportKind;
  importTarget: ImportTarget;
  category: string;
  slug: string;
  name: string;
  aliases: readonly string[];
  keywords: readonly string[];
  city: string;
  destination: string;
  country: string;
  sourceKey: string;
  /** This is always NEEDS_REVIEW; the package has no publish path. */
  status: PrivateReviewStatus;
  /** Editorial gates that must be completed outside this source pack. */
  requiredBeforePublication: readonly string[];
};

/**
 * A resolved, source-complete private candidate. It is intentionally
 * ContentImportCandidate-compatible only at the staging layer:
 * - `kind`, `category`, `name`, `aliases`, `city`, `country`, `source*`,
 *   normalized fields and `dedupeKey` map directly.
 * - `market`, `entityType`, `keywords`, `destination`, source metadata and
 *   review gates preserve editorial context for the owner.
 * - No public content fields (summary, address, coordinates, website, hours,
 *   pricing, booking link or public URL) are present.
 */
export type EuropeEditorialCandidate = Omit<CandidateInput, "sourceKey"> & {
  schemaVersion: typeof WHITE_GLOVE_EUROPE_SCHEMA_VERSION;
  /** Stable external identifier; this becomes sourceId when manually staged. */
  id: string;
  sourceId: string;
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  sourceAttribution: string;
  sourceEvidence: string;
  sourceRights: string;
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

export function normalizedLocation(city: string, country: string): string {
  return `${normalizeText(city)}, ${normalizeText(country)}`;
}

export function duplicateKey(
  entityType: CandidateEntityType,
  name: string,
  city: string,
  country: string,
): string {
  return [entityType, normalizeText(name), normalizedLocation(city, country)].join("::");
}

export function crossContentKey(name: string, city: string, country: string): string {
  return [normalizeText(name), normalizeText(city), normalizeText(country)].join("::");
}

export function makeCandidateId(
  input: Pick<CandidateInput, "market" | "entityType" | "slug">,
): string {
  return `wge-${input.market}-${input.entityType.replace(/_/g, "-")}-${input.slug}`;
}

export function sourceBackedCandidate(
  sources: Readonly<Record<string, SourceDefinition>>,
  input: CandidateInput,
): EuropeEditorialCandidate {
  const source = sources[input.sourceKey];
  if (!source) {
    throw new Error(`Unknown source key "${input.sourceKey}" for ${input.slug}`);
  }

  const id = makeCandidateId(input);
  return {
    ...input,
    schemaVersion: WHITE_GLOVE_EUROPE_SCHEMA_VERSION,
    id,
    sourceId: id,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceType: source.type,
    sourceAttribution: source.attribution,
    sourceEvidence: source.evidence,
    sourceRights: source.rights,
    sourceLastChecked: source.lastChecked,
    normalizedName: normalizeText(input.name),
    normalizedLocation: normalizedLocation(input.city, input.country),
    dedupeKey: duplicateKey(input.entityType, input.name, input.city, input.country),
  };
}
