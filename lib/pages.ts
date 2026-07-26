// Content-access layer for DB-backed general/marketing pages.
//
// Like lib/content.ts, every read FAILS SAFE: if DATABASE_URL is unset, the DB
// is unreachable, or the page isn't stored yet, it falls back to the built-in
// default from data/pages.ts. The public site keeps working before Neon is
// connected and upgrades to DB-backed, editable content afterwards.

import { editablePages, getPageDef, type PageDef } from "@/data/pages";

const DB_ENABLED = Boolean(process.env.DATABASE_URL);

export type ResolvedPage = {
  slug: string;
  eyebrow: string;
  title: string;
  body: string;
};

function fromDef(def: PageDef): ResolvedPage {
  return { slug: def.slug, eyebrow: def.eyebrow, title: def.title, body: def.body };
}

/**
 * The heading + intro for one page, merging any DB override over the built-in
 * default. Never throws — returns the default on any DB problem. Returns null
 * only for a slug that isn't a known editable page.
 */
export async function resolvePage(slug: string): Promise<ResolvedPage | null> {
  const def = getPageDef(slug);
  if (!def) return null;
  if (!DB_ENABLED) return fromDef(def);
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.page.findUnique({ where: { slug } });
    if (!row || row.status !== "PUBLISHED") return fromDef(def);
    return {
      slug,
      eyebrow: def.eyebrow,
      title: row.title || def.title,
      body: row.body || def.body,
    };
  } catch (error) {
    console.error("[pages] DB read failed for", slug, "- using default", error);
    return fromDef(def);
  }
}

/** All editable pages merged with any DB overrides, for the admin list. */
export async function listPagesForAdmin() {
  if (!DB_ENABLED) {
    return editablePages.map((def) => ({ ...fromDef(def), status: "PUBLISHED" as const, stored: false }));
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.page.findMany();
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    return editablePages.map((def) => {
      const row = bySlug.get(def.slug);
      return {
        slug: def.slug,
        eyebrow: def.eyebrow,
        title: row?.title || def.title,
        body: row?.body || def.body,
        status: (row?.status ?? "PUBLISHED") as "PUBLISHED" | "DRAFT" | "NEEDS_REVIEW",
        stored: Boolean(row),
      };
    });
  } catch {
    return editablePages.map((def) => ({ ...fromDef(def), status: "PUBLISHED" as const, stored: false }));
  }
}

/** One editable page (default merged with DB) for the admin editor. */
export async function getPageForAdmin(slug: string) {
  const def = getPageDef(slug);
  if (!def) return null;
  const base = { slug: def.slug, eyebrow: def.eyebrow, title: def.title, body: def.body, status: "PUBLISHED" as string, stored: false };
  if (!DB_ENABLED) return base;
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.page.findUnique({ where: { slug } });
    if (!row) return base;
    return { slug, eyebrow: def.eyebrow, title: row.title, body: row.body, status: row.status as string, stored: true };
  } catch {
    return base;
  }
}
