import { cemeteries } from "@/data/cemeteries";
import { guidedDestinations, unguidedDestinations } from "@/data/destinations";
import { applyReview, type ReviewInput } from "@/lib/suggestions";

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

export type SuggestionStatus = "pending" | "approved" | "rejected" | "needs-info";

/**
 * One decision, kept forever.
 *
 * Changing your mind about a correction is normal — a phone number that looked
 * wrong turns out to be right, or the other way round. The first answer is
 * part of the record rather than a mistake to be overwritten, which is what
 * §8's "history" asks for.
 */
export type SuggestionReview = {
  at: string;
  status: SuggestionStatus;
  notes: string;
  /** The wording accepted, when the reviewer edited before approving. */
  accepted?: string;
};

export type EditSuggestion = {
  id: string;
  targetType: "location" | "accommodation" | "site" | "directory" | "new";
  targetId: string;
  title: string;
  name: string;
  email: string;
  issue: string;
  currentInfo: string;
  suggestedInfo: string;
  source: string;
  status: SuggestionStatus;
  createdAt: string;
  /** The latest decision. `history` has all of them. */
  reviewedAt?: string;
  reviewerNotes?: string;
  /**
   * The correction as it was accepted, when the reviewer changed the wording
   * before approving it. `suggestedInfo` keeps the visitor's own words.
   */
  acceptedInfo?: string;
  history?: SuggestionReview[];
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
  | "itinerary-footer"
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
  /** A video to play instead of the picture. Takes precedence when both are set. */
  videoUrl: string;
  /**
   * Who the advertisement is for.
   *
   * An advert used to carry nothing about whose it was — a title, a picture
   * and placements, and no way to look at a live one and know who to ring when
   * it needed changing. Never shown to a visitor; this is the owner's record.
   */
  advertiserName: string;
  advertiserPhone: string;
  advertiserEmail: string;
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

/**
 * A value goes in the request body, never in the address.
 *
 * This used to put the whole bundle in the URL — `set/<key>/<the entire
 * encoded content store>`. With every location seeded that address is over
 * 300,000 characters, which no HTTP server accepts: measured against a stock
 * Node server it is refused outright, and the save reports "connect the
 * private database" as though nothing were configured. Reads stay on GET,
 * where the address is only the key.
 *
 * The same shape lib/hechsher-store.ts and lib/media.ts already use.
 */
async function redis<T>(command: string, body?: string) {
  const config = redisConfig();
  if (!config) return undefined;
  const response = await fetch(`${config.url}/${command}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body,
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
  const guideLocations = guidedDestinations().map((guide) => ({
    id: `guide-${guide.slug}`,
    route: `/${guide.slug}`,
    title: guide.city,
    yiddishTitle: guide.yiddishCity,
    category: "city-guide" as const,
    country: guide.country,
    address: guide.guide.graveAddress ?? guide.city,
    coordinates: guide.guide.graveCoordinates ?? "",
    shomerContact: guide.guide.accessContacts?.[0]?.phone ?? guide.guide.accessContact?.phone ?? "",
    source: guide.guide.sourceUrl,
    notes: guide.guide.overview,
    status: "needs-review" as const,
    lastVerified: "",
  }));
  // Not a sample. These lists are what the "missing address / missing shomer"
  // counts are computed from, so truncating them made the report quietly
  // describe the first twenty of each rather than the site: 156 batei hachaim
  // were on the page and 20 of them were being counted, which is why the
  // missing-shomer figure read far lower than the real one.
  const destinationLocations = unguidedDestinations().map((destination) => ({
    id: `destination-${destination.slug}`,
    route: `/destinations/${destination.slug}`,
    title: destination.city,
    yiddishTitle: destination.yiddishCity,
    category: "destination" as const,
    country: destination.country,
    address: destination.summary ?? "",
    coordinates: "",
    shomerContact: "",
    source: `seed:${destination.slug}`,
    notes: destination.summary ?? "",
    status: "draft" as const,
    lastVerified: "",
  }));
  const cemeteryLocations = cemeteries.map((cemetery) => ({
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
      targetHref: "/services",
      imageUrl: "",
      pdfUrl: "",
      videoUrl: "",
      advertiserName: "",
      advertiserPhone: "",
      advertiserEmail: "",
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
  const payload = JSON.stringify({ ...bundle, updatedAt: new Date().toISOString() });
  const response = await redis(`set/${encodeURIComponent(contentKey)}`, payload);
  return Boolean(response);
}

export function contentStorageIsConfigured() {
  return Boolean(redisConfig());
}

export async function getAdminContent() {
  const bundle = await readBundle();
  // When this list was read. "Waiting three weeks" is measured from here, so
  // the moment belongs with the data it describes rather than being taken
  // again while a screen renders, where it would be a different number every
  // time the screen happened to re-render.
  return { configured: contentStorageIsConfigured(), bundle, readAt: Date.now() };
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
    ["itinerary-footer", "Bottom of the itinerary"],
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
    videoUrl: (promotion.videoUrl ?? "").trim(),
    advertiserName: (promotion.advertiserName ?? "").trim(),
    advertiserPhone: (promotion.advertiserPhone ?? "").trim(),
    advertiserEmail: (promotion.advertiserEmail ?? "").trim(),
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

/** Remove an advertisement for good. */
export async function deletePromotion(id: string) {
  const bundle = await readBundle();
  if (!bundle) return null;
  return writeBundle({ ...bundle, promotions: bundle.promotions.filter((p) => p.id !== id) });
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

/**
 * Record a decision on a suggestion.
 *
 * Returns `false` when there is nothing to write to, and `"missing"` when the
 * suggestion is not there — a decision on a suggestion that has gone used to
 * report success, having changed nothing at all.
 */
export async function reviewSuggestion(id: string, input: ReviewInput): Promise<boolean | "missing"> {
  if (!contentStorageIsConfigured()) return false;
  const bundle = await readBundle();
  if (!bundle.suggestions.some((item) => item.id === id)) return "missing";
  const at = new Date().toISOString();
  const suggestions = bundle.suggestions.map((item) => (item.id === id ? applyReview(item, input, at) : item));
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
