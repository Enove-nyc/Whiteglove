/**
 * The portable half of the bulk-content pipeline.
 *
 * This module deliberately knows nothing about Prisma, React, or a particular
 * source. It gives the command-line collectors, the admin preview, and the
 * database writer one definition of a complete, publishable record. Keeping
 * that definition here prevents the familiar bulk-import failure mode where a
 * preview accepts a row that the publisher later cannot safely use.
 *
 * A source-backed candidate is not a public listing. `canStage` asks whether
 * there is enough provenance to give an editor a useful lead; `canPublish`
 * adds the traveller-facing details that must be deliberately written or
 * checked before a record appears on the site.
 */

export const BULK_CONTENT_KINDS = ["ATTRACTION", "KOSHER_FOOD", "PLACE_TO_STAY", "PRACTICAL"] as const;
export type BulkContentKind = (typeof BULK_CONTENT_KINDS)[number];

export const ATTRACTION_KINDS = ["Jewish heritage", "Museum", "Landmark", "Nature", "Family", "Viewpoint"] as const;
export const PRACTICAL_CATEGORIES = [
  "ACCOMMODATION",
  "KOSHER_FOOD",
  "MINYAN",
  "MIKVAH",
  "TRANSPORT",
  "AIRPORT",
  "DRIVER",
  "TEFILLOS",
  "SHABBOS",
  "HOSPITAL",
  "EMERGENCY",
  "GROCERY",
  "PARKING",
] as const;

export type BulkContentCandidateInput = {
  kind: BulkContentKind;
  /** Attraction kind or PracticalPlace category, depending on `kind`. */
  category?: string | null;
  name: string;
  aliases?: string[];
  city: string;
  region?: string | null;
  country: string;
  /** Existing Destination.slug for records that will become PracticalPlace rows. */
  destinationSlug?: string | null;
  address?: string | null;
  coordinates?: string | null;
  website?: string | null;
  /** Customer-facing copy. Source collectors leave this blank on purpose. */
  summary?: string | null;
  /** Required before a place-to-stay candidate can become a KosherStay row. */
  anchorName?: string | null;
  anchorCoords?: string | null;
  /** A bulk collector may never elevate this to "confirmed". */
  kosherClaim?: string | null;
  /** A certifier/community directory URL — required for public kosher food. */
  kosherSourceUrl?: string | null;
  /** Stable, public provenance for the source record itself. */
  sourceUrl: string;
  sourceId: string;
  sourceName: string;
  attribution: string;
  license?: string | null;
  /** Preserved raw tags or source fields for an editor to inspect. */
  sourceEvidence?: unknown;
};

export type BulkContentSourceProvenance = Pick<
  BulkContentCandidateInput,
  "sourceUrl" | "sourceName" | "attribution" | "kosherSourceUrl" | "sourceEvidence"
>;

export type PreparedBulkContentCandidate = BulkContentCandidateInput & {
  aliases: string[];
  category: string | null;
  region: string | null;
  destinationSlug: string | null;
  address: string | null;
  coordinates: string | null;
  website: string | null;
  summary: string | null;
  anchorName: string | null;
  anchorCoords: string | null;
  kosherClaim: string;
  kosherSourceUrl: string | null;
  license: string | null;
  normalizedName: string;
  normalizedLocation: string;
  dedupeKey: string;
  /** A source is complete enough to be held privately for an editor. */
  stageErrors: string[];
  /** A row may publish only when these are all cleared. */
  publishBlockers: string[];
  canStage: boolean;
  canPublish: boolean;
};

export type KnownContentRecord = {
  id: string;
  kind: BulkContentKind | "EXISTING";
  name: string;
  city: string;
  country: string;
  sourceUrl?: string | null;
  sourceId?: string | null;
};

export type DuplicateMatch = {
  id: string;
  reason: "source" | "name-and-location";
};

const COORDINATES = /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/;

export function normalizeContentText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeSourceUrl(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function isUsableSourceUrl(value: string | null | undefined): boolean {
  return Boolean(normalizeSourceUrl(value));
}

const DISALLOWED_IMPORT_HOSTS = new Set([
  "openstreetmap.org",
  "overpass-api.de",
  "photon.komoot.io",
  "maps.googleapis.com",
  "places.googleapis.com",
  "google.com",
  "maps.google.com",
]);

function sourceEvidenceText(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

/**
 * Candidate packages may cite official, community, certifier, or other
 * editorial sources. They must never be derived from a map index or a Google
 * places product, even when the resulting row has a valid URL and coordinates.
 */
export function isDisallowedImportSource(source: BulkContentSourceProvenance): boolean {
  const urls = [source.sourceUrl, source.kosherSourceUrl].filter((value): value is string => Boolean(value?.trim()));
  const hasDisallowedHost = urls.some((value) => {
    try {
      const hostname = new URL(value).hostname.toLocaleLowerCase("en");
      return [...DISALLOWED_IMPORT_HOSTS].some((host) => hostname === host || hostname.endsWith(`.${host}`));
    } catch {
      return false;
    }
  });
  if (hasDisallowedHost) return true;

  const sourceText = [
    source.sourceName,
    source.attribution,
    sourceEvidenceText(source.sourceEvidence),
  ].filter(Boolean).join(" ").toLocaleLowerCase("en");
  return /\b(?:openstreetmap|overpass|photon)\b|\bgoogle\s*(?:maps|places?)\b/.test(sourceText);
}

export function isValidCoordinates(value: string | null | undefined): boolean {
  if (!value || !COORDINATES.test(value)) return false;
  const [latitude, longitude] = value.split(",").map((part) => Number(part.trim()));
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 && (latitude !== 0 || longitude !== 0);
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniqueText(values: readonly string[] | null | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function sourceKey(sourceUrl: string, sourceId: string): string {
  const url = normalizeSourceUrl(sourceUrl);
  const id = sourceId.trim().toLowerCase();
  return url && id ? `source:${url}#${id}` : "";
}

function locationKey(name: string, city: string, country: string): string {
  return `${normalizeContentText(name)}|${normalizeContentText(city)}|${normalizeContentText(country)}`;
}

function isAttractionKind(value: string | null): boolean {
  return Boolean(value && (ATTRACTION_KINDS as readonly string[]).includes(value));
}

function isPracticalCategory(value: string | null): boolean {
  return Boolean(value && (PRACTICAL_CATEGORIES as readonly string[]).includes(value));
}

/**
 * Normalize a collector row and identify exactly what it is missing. Staged
 * candidates are permitted to lack customer copy or an editorial anchor; they
 * are never allowed to lack a source, source ID, name, or destination.
 */
export function prepareBulkContentCandidate(input: BulkContentCandidateInput): PreparedBulkContentCandidate {
  const name = input.name.trim();
  const city = input.city.trim();
  const country = input.country.trim();
  const sourceUrl = input.sourceUrl.trim();
  const sourceId = input.sourceId.trim();
  const sourceName = input.sourceName.trim();
  const attribution = input.attribution.trim();
  const category = clean(input.category);
  const coordinates = clean(input.coordinates);
  const stageErrors: string[] = [];

  if (!name) stageErrors.push("A canonical name is required.");
  if (!city) stageErrors.push("A city is required.");
  if (!country) stageErrors.push("A country is required.");
  if (!isUsableSourceUrl(sourceUrl)) stageErrors.push("A public HTTP(S) source URL is required.");
  if (!sourceId) stageErrors.push("A stable source ID is required.");
  if (!sourceName) stageErrors.push("Name the source dataset or publisher.");
  if (!attribution) stageErrors.push("Source attribution is required.");
  if (isDisallowedImportSource(input)) {
    stageErrors.push("OpenStreetMap, Overpass, Photon, Google Maps, and Google Places cannot be used for import candidates.");
  }
  if (coordinates && !isValidCoordinates(coordinates)) stageErrors.push("Coordinates must be a real latitude, longitude pair.");
  if (!BULK_CONTENT_KINDS.includes(input.kind)) stageErrors.push("Choose a supported content type.");

  const publishBlockers = [...stageErrors];
  if (!clean(input.summary)) publishBlockers.push("Write a customer-ready summary before publishing.");
  if (!coordinates && !clean(input.address)) publishBlockers.push("Add a published address or navigable coordinates before publishing.");
  if (!sourceEvidenceText(input.sourceEvidence).trim()) {
    publishBlockers.push("Keep source evidence for the editor before publishing.");
  }

  if (input.kind === "ATTRACTION" && !isAttractionKind(category)) {
    publishBlockers.push("Choose a supported attraction kind before publishing.");
  }

  if (input.kind === "PLACE_TO_STAY") {
    if (!clean(input.anchorName)) publishBlockers.push("Name the Jewish quarter or shul this place is near.");
    if (!isValidCoordinates(input.anchorCoords)) publishBlockers.push("Add real coordinates for that quarter or shul.");
    if (category !== "Ordinary hotel, well placed") {
      publishBlockers.push("A bulk import can publish only an ordinary place to stay; add any kosher status in the destination editor.");
    }
    if (input.kosherClaim === "confirmed" || input.kosherClaim === "reported") {
      publishBlockers.push("A bulk import cannot publish a kosher claim; confirm it in the destination editor.");
    }
  }

  if (input.kind === "PRACTICAL") {
    if (!isPracticalCategory(category)) publishBlockers.push("Choose a supported practical-travel category.");
    if (!clean(input.destinationSlug)) publishBlockers.push("Link this practical listing to an existing destination.");
  }

  if (input.kind === "KOSHER_FOOD") {
    if (!isUsableSourceUrl(input.kosherSourceUrl)) {
      publishBlockers.push("Add an official community or certification-directory source before publishing kosher food.");
    }
    if (!clean(input.destinationSlug)) publishBlockers.push("Link this kosher food listing to an existing destination.");
    // A source directory is a useful editorial lead, but the site deliberately
    // reserves the public decision for the destination editor, where a person
    // can check the current certification and wording rather than treating a
    // bulk source as a blanket kosher promise.
    publishBlockers.push("Confirm current kosher status in the destination editor before publishing.");
    if (input.kosherClaim === "confirmed") {
      publishBlockers.push("A bulk import cannot publish a confirmed kosher claim.");
    }
  }

  const normalizedName = normalizeContentText(name);
  const normalizedLocation = locationKey(name, city, country);
  const dedupeKey = sourceKey(sourceUrl, sourceId) || `listing:${input.kind.toLowerCase()}:${normalizedLocation}`;

  return {
    ...input,
    name,
    aliases: uniqueText(input.aliases),
    city,
    region: clean(input.region),
    country,
    destinationSlug: clean(input.destinationSlug),
    address: clean(input.address),
    coordinates,
    website: clean(input.website),
    summary: clean(input.summary),
    anchorName: clean(input.anchorName),
    anchorCoords: clean(input.anchorCoords),
    kosherClaim: input.kosherClaim === "reported" ? "reported" : "none",
    kosherSourceUrl: clean(input.kosherSourceUrl),
    sourceUrl,
    sourceId,
    sourceName,
    attribution,
    license: clean(input.license),
    category,
    normalizedName,
    normalizedLocation,
    dedupeKey,
    stageErrors,
    publishBlockers: uniqueText(publishBlockers),
    canStage: stageErrors.length === 0,
    canPublish: stageErrors.length === 0 && publishBlockers.length === 0,
  };
}

/**
 * Finds a duplicate by stable source identity first, then the deliberately
 * conservative normalized name + city + country fallback. The fallback makes a
 * new source record visible to an editor rather than silently creating a
 * second public listing for the same place.
 */
export function findBulkContentDuplicate(
  candidate: PreparedBulkContentCandidate,
  existing: readonly KnownContentRecord[],
): DuplicateMatch | null {
  const normalizedSource = normalizeSourceUrl(candidate.sourceUrl);
  const location = locationKey(candidate.name, candidate.city, candidate.country);

  for (const item of existing) {
    const sameSourceUrl = normalizedSource && normalizeSourceUrl(item.sourceUrl) === normalizedSource;
    const sameSourceId =
      candidate.sourceId.trim() &&
      item.sourceId?.trim() &&
      candidate.sourceId.trim().toLocaleLowerCase("en") === item.sourceId.trim().toLocaleLowerCase("en");
    // Older owned rows do not carry a source ID. Their source URL is the
    // record-level source, so an exact URL remains a useful duplicate signal.
    if (sameSourceUrl && (sameSourceId || !item.sourceId?.trim())) {
      return { id: item.id, reason: "source" };
    }
    if (location === locationKey(item.name, item.city, item.country)) {
      return { id: item.id, reason: "name-and-location" };
    }
  }
  return null;
}

export function bulkContentKindLabel(kind: BulkContentKind): string {
  return {
    ATTRACTION: "Attraction",
    KOSHER_FOOD: "Kosher food",
    PLACE_TO_STAY: "Place to stay",
    PRACTICAL: "Practical travel",
  }[kind];
}
