// Content-access layer for the service-provider Directory.
//
// Public reads FAIL SAFE and always return something: if the database is
// connected and populated, published providers come from the DB (editable in
// the admin directory); otherwise they fall back to the built-in list in
// data/directory.ts, so /directory works before and after the DB is set up.

import {
  directoryProviders,
  PROVIDER_CATEGORY_LABELS,
  PROVIDER_CATEGORY_ORDER,
  type ProviderCat,
} from "@/data/directory";
import { listStoredProviders } from "@/lib/directory-store";
import { publishableContact } from "@/lib/provider-contact";

export { PROVIDER_CATEGORY_LABELS, PROVIDER_CATEGORY_ORDER };
export type { ProviderCat };

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export type PublicProvider = {
  slug: string;
  name: string;
  category: ProviderCat;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  basedIn: string | null;
  regions: string[];
  languages: string[];
  specialties: string[];
  featured: boolean;
  source: string | null;
  /** Set when a number is held on file but may not be published. */
  contactWithheld: boolean;
  /** When somebody last checked this listing. Null unless it was checked. */
  verifiedAt: string | null;
  /** How quickly they answer, in their own words. */
  responseTime: string | null;
};

function fromStatic(): PublicProvider[] {
  // Every built-in entry is gathered from a public page of the provider's own
  // and carries the `source` to prove it, which is what makes its number
  // publishable. withPublishableContact still decides — an entry that ever
  // loses its source loses its number with it.
  return directoryProviders.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    ...publishableContact(p, { source: p.source }),
    email: p.email ?? null,
    website: p.website ?? null,
    basedIn: p.basedIn ?? null,
    regions: p.regions ?? [],
    languages: p.languages ?? [],
    specialties: p.specialties ?? [],
    featured: p.featured ?? false,
    source: p.source ?? null,
    verifiedAt: null,
    responseTime: null,
  }));
}

function sortProviders(list: PublicProvider[]): PublicProvider[] {
  return [...list].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

const splitList = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

// Owner-added providers from the Redis store (works even without Postgres).
async function fromStore(): Promise<PublicProvider[]> {
  try {
    const stored = await listStoredProviders();
    return stored
      .filter((p) => p.published !== false)
      .map((p) => ({
        slug: p.id,
        name: p.name,
        category: p.category as ProviderCat,
        tagline: p.tagline ?? null,
        description: [p.description, p.services].filter(Boolean).join(" — ") || null,
        // Owner-typed listings have no public source, so consent is the only
        // ground — which is the whole point of the flag.
        ...publishableContact(p, { contactConsent: p.contactConsent }),
        email: p.email ?? null,
        website: p.website ?? null,
        basedIn: p.basedIn ?? null,
        regions: splitList(p.regions),
        languages: splitList(p.languages),
        specialties: splitList(p.specialties),
        featured: Boolean(p.featured),
        source: null,
        verifiedAt: p.verifiedAt ?? null,
        responseTime: p.responseTime ?? null,
      }));
  } catch {
    return [];
  }
}

/** All published providers: owner-added (Redis) merged with the DB/static list. */
export async function getPublicProviders(): Promise<PublicProvider[]> {
  const store = await fromStore();
  if (!DB_ENABLED) return sortProviders([...store, ...fromStatic()]);
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.directoryProvider.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    if (!rows.length) return sortProviders([...store, ...fromStatic()]);
    const dbProviders: PublicProvider[] = rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category as ProviderCat,
      tagline: r.tagline,
      description: r.description,
      ...publishableContact(r, { contactConsent: r.contactConsent, source: r.source }),
      email: r.email,
      website: r.website,
      basedIn: r.basedIn,
      regions: r.regions,
      languages: r.languages,
      specialties: r.specialties,
      featured: r.featured,
      source: r.source,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      responseTime: r.responseTime,
    }));
    return sortProviders([...store, ...dbProviders]);
  } catch (error) {
    console.error("[directory] DB read failed — using static fallback", error);
    return sortProviders([...store, ...fromStatic()]);
  }
}
