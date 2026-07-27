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
};

function fromStatic(): PublicProvider[] {
  return directoryProviders.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    phone: p.phone ?? null,
    whatsapp: p.whatsapp ?? null,
    email: p.email ?? null,
    website: p.website ?? null,
    basedIn: p.basedIn ?? null,
    regions: p.regions ?? [],
    languages: p.languages ?? [],
    specialties: p.specialties ?? [],
    featured: p.featured ?? false,
    source: p.source ?? null,
  }));
}

function sortProviders(list: PublicProvider[]): PublicProvider[] {
  return [...list].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** All published providers, from the DB when available, else the static list. */
export async function getPublicProviders(): Promise<PublicProvider[]> {
  if (!DB_ENABLED) return sortProviders(fromStatic());
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.directoryProvider.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    if (!rows.length) return sortProviders(fromStatic());
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category as ProviderCat,
      tagline: r.tagline,
      description: r.description,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      website: r.website,
      basedIn: r.basedIn,
      regions: r.regions,
      languages: r.languages,
      specialties: r.specialties,
      featured: r.featured,
      source: r.source,
    }));
  } catch (error) {
    console.error("[directory] DB read failed — using static fallback", error);
    return sortProviders(fromStatic());
  }
}
