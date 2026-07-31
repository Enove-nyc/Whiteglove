// Owner-managed service-provider directory, stored in the connected Upstash
// Redis (same store as accounts/expenses/ads). This lets the owner add
// providers even when the Neon/Postgres directory isn't connected. Public
// reads merge these with any DB/static providers.

export type StoredProvider = {
  id: string;
  name: string;
  category: "TOUR_OPERATOR" | "VACATION_PLANNER" | "TRAVEL_AGENCY" | "GUIDE_DRIVER";
  services?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  basedIn?: string;
  regions?: string; // comma-separated
  languages?: string; // comma-separated
  specialties?: string; // comma-separated
  notes?: string;
  featured?: boolean;
  published?: boolean;
  /**
   * Permission to put their phone number on a public page.
   *
   * These are the listings the owner typed in from a number somebody gave
   * them, which is exactly the case where having been given a number once is
   * not the same as agreeing to it being published. Absent means no, and the
   * number is kept but withheld.
   */
  contactConsent?: boolean;
  /** How it was given — "asked by phone, 4 March" — so it is not a memory. */
  contactConsentNote?: string;
  /** When the listing itself was last checked. Shown only when set. */
  verifiedAt?: string;
  /** In their words: "same day", "within a week". */
  responseTime?: string;
  createdAt: string;
};

const KEY = "white-glove:directory";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function directoryStoreAvailable() {
  return Boolean(redisConfig());
}

async function redisGet(): Promise<StoredProvider[]> {
  const config = redisConfig();
  if (!config) return [];
  try {
    const res = await fetch(`${config.url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = ((await res.json()) as { result?: string }).result;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredProvider[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function redisSet(items: StoredProvider[]): Promise<boolean> {
  const config = redisConfig();
  if (!config) return false;
  try {
    const res = await fetch(`${config.url}/set/${encodeURIComponent(KEY)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body: JSON.stringify(items.slice(0, 2000)),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listStoredProviders(): Promise<StoredProvider[]> {
  return redisGet();
}

const CATEGORIES = new Set(["TOUR_OPERATOR", "VACATION_PLANNER", "TRAVEL_AGENCY", "GUIDE_DRIVER"]);
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function saveStoredProvider(input: Partial<StoredProvider> & { name?: string }): Promise<StoredProvider | null> {
  if (!directoryStoreAvailable()) return null;
  const name = clean(input.name, 160);
  if (!name) return null;
  const items = await listStoredProviders();
  const category = (CATEGORIES.has(String(input.category)) ? input.category : "TOUR_OPERATOR") as StoredProvider["category"];
  const base: StoredProvider = {
    id: clean(input.id, 60) || `dir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    category,
    services: clean(input.services, 400) || undefined,
    tagline: clean(input.tagline, 200) || undefined,
    description: clean(input.description, 1200) || undefined,
    phone: clean(input.phone, 60) || undefined,
    whatsapp: clean(input.whatsapp, 60) || undefined,
    email: clean(input.email, 160) || undefined,
    website: clean(input.website, 300) || undefined,
    basedIn: clean(input.basedIn, 160) || undefined,
    regions: clean(input.regions, 300) || undefined,
    languages: clean(input.languages, 200) || undefined,
    specialties: clean(input.specialties, 300) || undefined,
    notes: clean(input.notes, 600) || undefined,
    featured: Boolean(input.featured),
    published: input.published !== false,
    contactConsent: Boolean(input.contactConsent),
    contactConsentNote: clean(input.contactConsentNote, 300) || undefined,
    verifiedAt: clean(input.verifiedAt, 40) || undefined,
    responseTime: clean(input.responseTime, 80) || undefined,
    createdAt: items.find((p) => p.id === input.id)?.createdAt || new Date().toISOString(),
  };
  const next = [base, ...items.filter((p) => p.id !== base.id)];
  const ok = await redisSet(next);
  return ok ? base : null;
}

export async function deleteStoredProvider(id: string): Promise<boolean> {
  if (!directoryStoreAvailable()) return false;
  const items = await listStoredProviders();
  return redisSet(items.filter((p) => p.id !== id));
}
