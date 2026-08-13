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

/**
 * Every place a provider can change calls `updateTag(DIRECTORY_PUBLIC_TAG)`
 * after it writes — the Redis-backed quick-add route, the Prisma-backed
 * admin editor, and the bulk re-import. Miss one and that path goes stale
 * silently, which is exactly the failure `force-dynamic` was protecting
 * against before this file existed. See getPublicProviders below.
 */
export const DIRECTORY_PUBLIC_TAG = "directory-public";

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

export type ProviderReading = {
  providers: PublicProvider[];
  source: DirectorySource;
  /**
   * How many of them ship with the site rather than being his.
   *
   * Every branch below mixes the two now, so "where did this list come from"
   * stopped being a single answer. Counting them is what lets the admin say
   * so plainly instead of leaving him to work out which thirty of his
   * businesses he does not remember adding.
   */
  builtIn: number;
};

/**
 * The businesses, and where they came from.
 *
 * Use this anywhere somebody needs to know whether they are looking at the
 * real directory. The public pages do not need to and use getPublicProviders.
 */
export async function readProviders(): Promise<ProviderReading> {
  const store = await fromStore();
  if (!DB_ENABLED) return { providers: sortProviders([...store, ...fromStatic()]), source: "no-database", builtIn: fromStatic().length };
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.directoryProvider.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });
    if (!rows.length) return { providers: sortProviders([...store, ...fromStatic()]), source: "database-empty", builtIn: fromStatic().length };
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
    // MERGED, NOT REPLACED. This branch used to return the database rows
    // alone, so the thirty built-in businesses disappeared the moment one row
    // was published — the directory went from thirty listings to one, and the
    // category filters read zero planners, zero agencies, zero guides. Issues
    // #210 and #212 were both this.
    //
    // The other three branches here have always merged the built-ins in. This
    // one being the odd one out is what made the bug look like an import
    // problem: the directory really did empty out on re-import, because
    // importing is what first put a row in the table.
    //
    // His own win a collision, by slug: a built-in entry he has since edited
    // and published is his, and showing both would list the business twice.
    const mine = new Set([...store, ...dbProviders].map((p) => p.slug));
    const builtIn = fromStatic().filter((p) => !mine.has(p.slug));
    return { providers: sortProviders([...store, ...dbProviders, ...builtIn]), source: "database", builtIn: builtIn.length };
  } catch (error) {
    console.error("[directory] DB read failed — using static fallback", error);
    return { providers: sortProviders([...store, ...fromStatic()]), source: "database-failed", builtIn: fromStatic().length };
  }
}

/**
 * All published providers. For the public pages, which show what there is.
 *
 * CACHED, WITH EXPLICIT INVALIDATION — not a time-based `revalidate` on the
 * page. `revalidate` was tried on /directory itself and measured to not
 * work: this function mixes a Prisma read with a `cache: "no-store"` fetch
 * to Redis (inside fromStore, via listStoredProviders), and a no-store fetch
 * inside a page left the page frozen at its build-time render regardless of
 * the revalidate window. Caching the DATA here instead, tagged, and busting
 * that tag the moment a write actually happens (see DIRECTORY_PUBLIC_TAG),
 * gives the same instant-on-save freshness as force-dynamic did — but reuses
 * the render for every visit in between, which is what force-dynamic was
 * spending real compute on for no reason.
 *
 * `readProviders` itself stays uncached and is what the admin screen calls
 * directly — it has to see a save immediately, before anything invalidates
 * a tag.
 *
 * `next/cache` is imported dynamically, not at module scope, for the same
 * reason the Prisma client is below: this file is imported directly by
 * plain-Node tests that never touch a Next.js request context, and a
 * top-level `unstable_cache` import breaks module resolution for all of
 * them even when nothing calls this function.
 */
export async function getPublicProviders(): Promise<PublicProvider[]> {
  const { unstable_cache } = await import("next/cache");
  const cachedReading = unstable_cache(readProviders, ["directory-public-reading"], {
    tags: [DIRECTORY_PUBLIC_TAG],
    // A safety net, not the mechanism: every write path calls updateTag, so
    // in practice this window is never what makes an edit appear. It only
    // matters if a write path is ever added that forgets to.
    revalidate: 3600,
  });
  return (await cachedReading()).providers;
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
