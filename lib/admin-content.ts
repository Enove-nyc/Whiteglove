import { bulkDestinations } from "@/data/bulk-destinations";
import { cemeteries } from "@/data/cemeteries";
import { cityGuides } from "@/data/city-guides";

type RedisResult<T> = { result?: T };

export type SiteSettings = {
  heroTitle: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  publicNotice: string;
  footerEmail: string;
  bookingNotice: string;
};

export type EditableLocation = {
  id: string;
  route: string;
  title: string;
  yiddishTitle: string;
  category: "city-guide" | "destination" | "cemetery";
  country: string;
  address: string;
  coordinates: string;
  shomerContact: string;
  source: string;
  notes: string;
  status: "published" | "draft" | "needs-review";
  lastVerified: string;
};

export type EditableAccommodation = {
  id: string;
  locationId: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  bookingLink: string;
  amenities: string;
  kosherInfo: string;
  notes: string;
  status: "published" | "draft" | "needs-review";
  lastVerified: string;
};

export type EditSuggestion = {
  id: string;
  targetType: "location" | "accommodation" | "site";
  targetId: string;
  title: string;
  name: string;
  email: string;
  issue: string;
  currentInfo: string;
  suggestedInfo: string;
  source: string;
  status: "pending" | "approved" | "rejected" | "needs-info";
  createdAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
};

export type AdminContentBundle = {
  settings: SiteSettings;
  locations: EditableLocation[];
  accommodations: EditableAccommodation[];
  suggestions: EditSuggestion[];
  updatedAt?: string;
};

const contentKey = "white-glove:content";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string) {
  const config = redisConfig();
  if (!config) return undefined;
  const response = await fetch(`${config.url}/${command}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  return (await response.json()) as RedisResult<T>;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function defaultSettings(): SiteSettings {
  return {
    heroTitle: "Every Journey Begins with Purpose.",
    heroSubtitle: "A trusted guide for meaningful journeys: tefillos, kosher food, minyanim, mikvaos, local contacts, and every practical detail around your visit.",
    searchPlaceholder: "Search a city, tzaddik, or country...",
    publicNotice: "Travel and access information is checked before publication.",
    footerEmail: "hello@whitegloveitineraries.com",
    bookingNotice: "Live travel tools remain linked to the owner dashboard and can be refined here.",
  };
}

function defaultLocations(): EditableLocation[] {
  const guideLocations = cityGuides.map((guide) => ({
    id: `guide-${guide.slug}`,
    route: `/${guide.slug}`,
    title: guide.city,
    yiddishTitle: guide.yiddishCity,
    category: "city-guide" as const,
    country: guide.country,
    address: guide.graveAddress ?? guide.city,
    coordinates: guide.graveCoordinates ?? "",
    shomerContact: guide.accessContacts?.[0]?.phone ?? guide.accessContact?.phone ?? "",
    source: guide.sourceUrl,
    notes: guide.overview,
    status: "needs-review" as const,
    lastVerified: "",
  }));
  const destinationLocations = bulkDestinations.slice(0, 20).map((destination) => ({
    id: `destination-${destination.slug}`,
    route: `/destinations/${destination.slug}`,
    title: destination.city,
    yiddishTitle: destination.yiddishCity,
    category: "destination" as const,
    country: destination.country,
    address: destination.summary,
    coordinates: "",
    shomerContact: "",
    source: `seed:${destination.slug}`,
    notes: destination.summary,
    status: "draft" as const,
    lastVerified: "",
  }));
  const cemeteryLocations = cemeteries.slice(0, 20).map((cemetery) => ({
    id: `cemetery-${cemetery.slug}`,
    route: `/cemeteries/${cemetery.slug}`,
    title: cemetery.name,
    yiddishTitle: cemetery.yiddishName,
    category: "cemetery" as const,
    country: cemetery.country,
    address: cemetery.address,
    coordinates: cemetery.coordinates ?? "",
    shomerContact: cemetery.accessContacts?.[0]?.phone ?? "",
    source: cemetery.sourceUrl,
    notes: cemetery.arrivalNotes[0] ?? "",
    status: cemetery.accessContacts?.length ? ("published" as const) : ("needs-review" as const),
    lastVerified: "",
  }));
  return [...guideLocations, ...destinationLocations, ...cemeteryLocations];
}

const defaultBundle = (): AdminContentBundle => ({
  settings: defaultSettings(),
  locations: defaultLocations(),
  accommodations: [],
  suggestions: [],
  updatedAt: new Date().toISOString(),
});

function parseBundle(value?: string): AdminContentBundle {
  if (!value) return defaultBundle();
  try {
    const parsed = JSON.parse(value) as AdminContentBundle;
    return {
      settings: parsed.settings ?? defaultSettings(),
      locations: Array.isArray(parsed.locations) ? parsed.locations : defaultLocations(),
      accommodations: Array.isArray(parsed.accommodations) ? parsed.accommodations : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return defaultBundle();
  }
}

async function readBundle() {
  const response = await redis<string>(`get/${encodeURIComponent(contentKey)}`);
  return parseBundle(response?.result);
}

async function writeBundle(bundle: AdminContentBundle) {
  const payload = encodeURIComponent(JSON.stringify({ ...bundle, updatedAt: new Date().toISOString() }));
  const response = await redis(`set/${encodeURIComponent(contentKey)}/${payload}`);
  return Boolean(response);
}

export function contentStorageIsConfigured() {
  return Boolean(redisConfig());
}

export async function getAdminContent() {
  const bundle = await readBundle();
  return { configured: contentStorageIsConfigured(), bundle };
}

export async function saveSiteSettings(settings: Partial<SiteSettings>) {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  return writeBundle({ ...bundle, settings: { ...bundle.settings, ...settings } });
}

export async function upsertLocation(location: EditableLocation) {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const next = bundle.locations.filter((item) => item.id !== location.id).concat({ ...location });
  return writeBundle({ ...bundle, locations: next });
}

export async function upsertAccommodation(accommodation: EditableAccommodation) {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const next = bundle.accommodations.filter((item) => item.id !== accommodation.id).concat({ ...accommodation });
  return writeBundle({ ...bundle, accommodations: next });
}

export async function upsertLocations(locations: EditableLocation[]) {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const incoming = locations.filter((location) => location.id.trim() && location.title.trim());
  const map = new Map(bundle.locations.map((item) => [item.id, item]));
  for (const location of incoming) {
    map.set(location.id, { ...location });
  }
  return writeBundle({ ...bundle, locations: [...map.values()] });
}

export async function addSuggestion(suggestion: Omit<EditSuggestion, "id" | "status" | "createdAt">) {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const next: EditSuggestion = {
    ...suggestion,
    id: `suggestion-${slugify(`${suggestion.targetType}-${suggestion.targetId}-${suggestion.name}-${Date.now()}`)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  return writeBundle({ ...bundle, suggestions: [next, ...bundle.suggestions] });
}

export async function updateSuggestionStatus(id: string, status: EditSuggestion["status"], reviewerNotes = "") {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const suggestions = bundle.suggestions.map((item) => item.id === id ? { ...item, status, reviewerNotes, reviewedAt: new Date().toISOString() } : item);
  return writeBundle({ ...bundle, suggestions });
}

export function getMissingContentReport(bundle: AdminContentBundle) {
  return {
    locationsMissingAddress: bundle.locations.filter((item) => !item.address.trim()).length,
    locationsMissingCoordinates: bundle.locations.filter((item) => !item.coordinates.trim()).length,
    locationsMissingShomer: bundle.locations.filter((item) => !item.shomerContact.trim()).length,
    accommodationsMissing: bundle.accommodations.filter((item) => !item.address.trim() || !item.name.trim()).length,
    pendingSuggestions: bundle.suggestions.filter((item) => item.status === "pending").length,
  };
}

export { slugify };
