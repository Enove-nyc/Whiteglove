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
  type PublicProvider,
} from "@/data/directory";
import { listStoredProviders } from "@/lib/directory-store";
import { publishableContact } from "@/lib/provider-contact";

export { PROVIDER_CATEGORY_LABELS, PROVIDER_CATEGORY_ORDER };
export type { ProviderCat };

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export type { PublicProvider };

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

/**
 * Where the businesses on screen actually came from.
 *
 * THIS EXISTS BECAUSE THE DIRECTORY VANISHED AND NOTHING SAID WHY. Three
 * separate paths here fall back to the thirty businesses that ship in
 * data/directory.ts — no database configured, the query returning nothing, and
 * the read failing outright — and all three returned that list in silence. The
 * owner saw his directory replaced by the samples with no error, no notice and
 * no way to tell which of the three had happened, or whether his own entries
 * still existed at all. They did.
 *
 * The fallback itself is right: these are real businesses, and a traveller
 * looking for a driver is better served by thirty than by none. What was wrong
 * was serving them as though they were his.
 */
export type DirectorySource =
  /** His own, out of the database. What it should be. */
  | "database"
  /** No DATABASE_URL. Nothing of his can be read at all. */
  | "no-database"
  /** The database answered, with nothing published in it. */
  | "database-empty"
  /** The read failed. His entries are almost certainly still there. */
  | "database-failed";

export type ProviderReading = { providers: PublicProvider[]; source: DirectorySource };

/**
 * The businesses, and where they came from.
 *
 * Use this anywhere somebody needs to know whether they are looking at the
 * real directory. The public pages do not need to and use getPublicProviders.
 */
export async function readProviders(): Promise<ProviderReading> {
  const store = await fromStore();
  if (!DB_ENABLED) return { providers: sortProviders([...store, ...fromStatic()]), source: "no-database" };
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.directoryProvider.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    if (!rows.length) return { providers: sortProviders([...store, ...fromStatic()]), source: "database-empty" };
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
    return { providers: sortProviders([...store, ...dbProviders]), source: "database" };
  } catch (error) {
    console.error("[directory] DB read failed — using static fallback", error);
    return { providers: sortProviders([...store, ...fromStatic()]), source: "database-failed" };
  }
}

/** All published providers. For the public pages, which show what there is. */
export async function getPublicProviders(): Promise<PublicProvider[]> {
  return (await readProviders()).providers;
}

/**
 * What to tell the owner about the list he is looking at, or null when it is
 * really his. Never a reassurance — only ever a reason it might not be.
 */
export function describeDirectorySource(source: DirectorySource, builtInCount: number): string | null {
  if (source === "database") return null;
  const showing = `You are looking at the ${builtInCount} businesses that ship with the site, not your own.`;
  if (source === "no-database") {
    return `${showing} There is no database connected, so nothing you have added can be read. Check DATABASE_URL on Settings → Connections.`;
  }
  if (source === "database-failed") {
    return `${showing} The database could not be read just now — your own entries are almost certainly still there. Try again in a minute, and check Settings → Connections.`;
  }
  return `${showing} The database answered, and nothing in it is published. Your entries may be saved as drafts — they are all listed under Directory → Businesses whatever their status.`;
}
