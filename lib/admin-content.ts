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

export type PromotionPlacement =
  | "popup"
  | "fixed-top-banner"
  | "sticky-bottom-banner"
  | "homepage-promo"
  | "inline-content"
  | "sidebar"
  | "destination-specific"
  | "accommodation-page"
  | "sponsored-listing"
  | "full-page-takeover";

export type PromotionDevice = "all" | "mobile" | "desktop";

export type Promotion = {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  targetHref: string;
  imageUrl: string;
  pdfUrl: string;
  placements: PromotionPlacement[];
  targetPaths: string;
  device: PromotionDevice;
  startDate: string;
  endDate: string;
  priority: number;
  maxViewsPerVisitor: number;
  enabled: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
  lastShownAt?: string;
  lastClickedAt?: string;
};

export type AdminContentBundle = {
  settings: SiteSettings;
  locations: EditableLocation[];
  accommodations: EditableAccommodation[];
  suggestions: EditSuggestion[];
  promotions: Promotion[];
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
    footerEmail: "whitegloveitineraries@gmail.com",
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

function defaultPromotions(): Promotion[] {
  const now = new Date().toISOString();
  return [
    {
      id: "homepage-planning-help",
      title: "Need help planning the rest of the trip?",
      description: "Ask White Glove for flights, hotels, drivers, and itinerary help in one place.",
      buttonText: "Start planning",
      targetHref: "/planning",
      imageUrl: "",
      pdfUrl: "",
      placements: ["homepage-promo", "inline-content"],
      targetPaths: "/",
      device: "all",
      startDate: "",
      endDate: "",
      priority: 1,
      maxViewsPerVisitor: 3,
      enabled: false,
      impressions: 0,
      clicks: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

const defaultBundle = (): AdminContentBundle => ({
  settings: defaultSettings(),
  locations: defaultLocations(),
  accommodations: [],
  suggestions: [],
  promotions: defaultPromotions(),
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
      promotions: Array.isArray(parsed.promotions) ? parsed.promotions : defaultPromotions(),
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

function placementLabels() {
  return new Map<PromotionPlacement, string>([
    ["popup", "Popup"],
    ["fixed-top-banner", "Fixed top banner"],
    ["sticky-bottom-banner", "Sticky bottom banner"],
    ["homepage-promo", "Homepage promotion"],
    ["inline-content", "Inline content"],
    ["sidebar", "Sidebar"],
    ["destination-specific", "Destination page"],
    ["accommodation-page", "Accommodation page"],
    ["sponsored-listing", "Sponsored listing"],
    ["full-page-takeover", "Full-page takeover"],
  ]);
}

function normalizePromotion(promotion: Promotion): Promotion {
  return {
    ...promotion,
    id: promotion.id.trim() || `promotion-${Date.now()}`,
    title: promotion.title.trim(),
    description: promotion.description.trim(),
    buttonText: promotion.buttonText.trim() || "Learn more",
    targetHref: promotion.targetHref.trim() || "/",
    imageUrl: promotion.imageUrl.trim(),
    pdfUrl: promotion.pdfUrl.trim(),
    placements: Array.isArray(promotion.placements) ? promotion.placements.filter((placement): placement is PromotionPlacement => placementLabels().has(placement)) : ["homepage-promo"],
    targetPaths: promotion.targetPaths.trim(),
    device: promotion.device === "mobile" || promotion.device === "desktop" ? promotion.device : "all",
    startDate: promotion.startDate.trim(),
    endDate: promotion.endDate.trim(),
    priority: Number.isFinite(Number(promotion.priority)) ? Number(promotion.priority) : 0,
    maxViewsPerVisitor: Math.max(0, Number(promotion.maxViewsPerVisitor) || 0),
    enabled: Boolean(promotion.enabled),
    impressions: Math.max(0, Number(promotion.impressions) || 0),
    clicks: Math.max(0, Number(promotion.clicks) || 0),
    createdAt: promotion.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastShownAt: promotion.lastShownAt,
    lastClickedAt: promotion.lastClickedAt,
  };
}

function parsePromotionTargets(targetPaths: string) {
  return targetPaths
    .split(/\r?\n|,/)
    .map((path) => path.trim())
    .filter(Boolean);
}

function matchesPromotionPath(promotion: Promotion, pathname: string) {
  const targets = parsePromotionTargets(promotion.targetPaths);
  if (targets.length === 0 || targets.includes("*")) return true;
  return targets.some((target) => pathname === target || pathname.startsWith(target.endsWith("/") ? target : `${target}/`));
}

function matchesPromotionDevice(promotion: Promotion, device: PromotionDevice) {
  return promotion.device === "all" || promotion.device === device;
}

function isPromotionActive(promotion: Promotion) {
  const now = new Date();
  if (promotion.startDate) {
    const start = new Date(promotion.startDate);
    if (Number.isFinite(start.getTime()) && start > now) return false;
  }
  if (promotion.endDate) {
    const end = new Date(promotion.endDate);
    if (Number.isFinite(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      if (end < now) return false;
    }
  }
  return true;
}

export async function upsertPromotion(promotion: Promotion) {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const nextPromotion = normalizePromotion(promotion);
  const promotions = bundle.promotions.filter((item) => item.id !== nextPromotion.id).concat(nextPromotion);
  return writeBundle({ ...bundle, promotions });
}

export async function recordPromotionEvent(id: string, kind: "impression" | "click") {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  const promotions = bundle.promotions.map((item) => {
    if (item.id !== id) return item;
    if (kind === "impression") {
      return { ...item, impressions: item.impressions + 1, lastShownAt: new Date().toISOString() };
    }
    return { ...item, clicks: item.clicks + 1, lastClickedAt: new Date().toISOString() };
  });
  return writeBundle({ ...bundle, promotions });
}

export async function getActivePromotions(placement: PromotionPlacement, pathname: string, device: PromotionDevice) {
  const bundle = await readBundle();
  return bundle.promotions
    .filter((promotion) => promotion.enabled)
    .filter((promotion) => promotion.placements.includes(placement))
    .filter((promotion) => matchesPromotionDevice(promotion, device))
    .filter((promotion) => matchesPromotionPath(promotion, pathname))
    .filter(isPromotionActive)
    .sort((left, right) => right.priority - left.priority || right.updatedAt.localeCompare(left.updatedAt));
}

export async function getPromotionsDashboard() {
  const bundle = await readBundle();
  const byPlacement = [...placementLabels().entries()].map(([placement, label]) => ({
    label,
    count: bundle.promotions.filter((item) => item.enabled && item.placements.includes(placement)).length,
  }));
  return {
    configured: contentStorageIsConfigured(),
    totalPromotions: bundle.promotions.length,
    enabledPromotions: bundle.promotions.filter((item) => item.enabled).length,
    totalImpressions: bundle.promotions.reduce((total, item) => total + item.impressions, 0),
    totalClicks: bundle.promotions.reduce((total, item) => total + item.clicks, 0),
    byPlacement,
  };
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
