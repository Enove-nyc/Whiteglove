/**
 * Server-side index for admin chrome search.
 *
 * Screens come from the nav. Published listings reuse the public search index
 * with admin edit links. NEEDS_REVIEW pack rows are read (never rewritten).
 */

import { allAdminDestinations } from "@/lib/admin-nav";
import { listStagedCandidatesForAdminSearch } from "@/lib/content-imports";
import { listSourcePackSearchRows } from "@/lib/import-review-queue";
import { compact, normalize } from "@/lib/site-search-match";
import { getSearchIndex } from "@/lib/site-search-index";
import type { SearchDocument } from "@/lib/site-search-types";
import type { AdminHit, AdminHitSection } from "@/lib/admin-search-types";

export type AdminSearchDocument = {
  id: string;
  section: AdminHitSection;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
  names: string[];
  keywords: string[];
  normTokens: string[];
  normCompact: string[];
};

function finalize(doc: Omit<AdminSearchDocument, "normTokens" | "normCompact">): AdminSearchDocument {
  const parts = [doc.title, ...doc.names, ...doc.keywords, doc.subtitle];
  const normTokens = unique(
    parts
      .flatMap((p) => normalize(p).split(" "))
      .filter((t) => t.length > 0),
  );
  const normCompact = unique(
    [doc.title, ...doc.names].map((p) => compact(p)).filter((t) => t.length >= 3),
  );
  return { ...doc, normTokens, normCompact };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

let cached: AdminSearchDocument[] | null = null;
let building: Promise<AdminSearchDocument[]> | null = null;

export function invalidateAdminSearchIndex(): void {
  cached = null;
  building = null;
}

export async function getAdminSearchIndex(): Promise<AdminSearchDocument[]> {
  if (cached) return cached;
  if (building) return building;
  building = buildAdminSearchIndex()
    .then((docs) => {
      cached = docs;
      building = null;
      return docs;
    })
    .catch((error) => {
      building = null;
      throw error;
    });
  return building;
}

export async function buildAdminSearchIndex(): Promise<AdminSearchDocument[]> {
  const docs: AdminSearchDocument[] = [];
  pushScreens(docs);
  await pushPublishedListings(docs);
  await pushCandidates(docs);
  return docs;
}

function pushScreens(docs: AdminSearchDocument[]) {
  for (const dest of allAdminDestinations()) {
    docs.push(
      finalize({
        id: `screen:${dest.href}:${dest.label}`,
        section: "Screens",
        kind: dest.section,
        title: dest.label,
        subtitle: `${dest.section} · ${dest.blurb}`,
        href: dest.href,
        names: [dest.label, dest.section],
        keywords: dest.keywords.split(" ").filter(Boolean),
      }),
    );
  }
}

function adminHrefForPublicDoc(doc: SearchDocument): { href: string; kind: string } | null {
  if (doc.id.startsWith("vacation-") || doc.id.startsWith("heritage-")) {
    const slug = doc.id.replace(/^(vacation|heritage)-/, "");
    return { href: `/admin/destinations?slug=${encodeURIComponent(slug)}`, kind: doc.kind };
  }
  if (doc.id.startsWith("cemetery-") || doc.id.startsWith("tzaddik-")) {
    return { href: "/admin/kevarim", kind: doc.kind };
  }
  if (doc.id.startsWith("attraction-") || doc.id.startsWith("stay-") || doc.id.startsWith("area-") || doc.id.startsWith("eatery-")) {
    return { href: "/admin/directory", kind: doc.kind };
  }
  if (doc.id.startsWith("practical-") || doc.id.startsWith("static-")) {
    const mikvah = /mikvah|mikveh|mikve/i.test(`${doc.title} ${doc.keywords.join(" ")} ${doc.subtitle}`);
    if (mikvah) return { href: "/admin/mikvaos", kind: "Mikvah" };
    const slug = doc.href.replace(/^\/destinations\//, "").replace(/^\/heritage\/towns\//, "").split("/")[0];
    if (slug && !slug.startsWith("http") && slug !== doc.href) {
      return { href: `/admin/destinations?slug=${encodeURIComponent(slug)}`, kind: doc.kind };
    }
    return { href: "/admin/destinations", kind: doc.kind };
  }
  if (doc.href === "/esim" || doc.href === "/transfers" || doc.href === "/travel-insurance" || doc.href === "/book") {
    return { href: "/admin/settings/earnings", kind: "Travel Essentials" };
  }
  if (doc.href === "/about") return { href: "/admin/settings/about", kind: "Site page" };
  if (doc.href === "/rate") return { href: "/admin/ratings", kind: "Site page" };
  if (doc.href === "/hechsherim") return { href: "/admin/hechsherim", kind: "Site page" };
  if (doc.href === "/mikvaos") return { href: "/admin/mikvaos", kind: "Site page" };
  if (doc.href === "/contact") return { href: "/admin/messages", kind: "Site page" };
  if (doc.id.startsWith("page-") || doc.id.startsWith("info-") || doc.id.startsWith("service-")) {
    const slug = doc.href.replace(/^\//, "").split("/")[0] || "pages";
    return { href: `/admin/pages?slug=${encodeURIComponent(slug)}`, kind: doc.kind };
  }
  return { href: "/admin/directory", kind: doc.kind };
}

async function pushPublishedListings(docs: AdminSearchDocument[]) {
  const publicDocs = await getSearchIndex();
  for (const doc of publicDocs) {
    if (doc.id.startsWith("page-") || doc.id.startsWith("service-") || doc.id.startsWith("info-")) {
      const mapped = adminHrefForPublicDoc(doc);
      if (!mapped) continue;
      docs.push(
        finalize({
          id: `admin-page:${doc.id}`,
          section: "Screens",
          kind: mapped.kind,
          title: doc.title,
          subtitle: doc.subtitle,
          href: mapped.href,
          names: doc.names,
          keywords: doc.keywords,
        }),
      );
      continue;
    }
    const mapped = adminHrefForPublicDoc(doc);
    if (!mapped) continue;
    docs.push(
      finalize({
        id: `listing:${doc.id}`,
        section: "Listings",
        kind: mapped.kind,
        title: doc.title,
        subtitle: doc.subtitle,
        href: mapped.href,
        names: doc.names,
        keywords: doc.keywords,
      }),
    );
  }
}

async function pushCandidates(docs: AdminSearchDocument[]) {
  const staged = await listStagedCandidatesForAdminSearch();
  const stagedIds = new Set(staged.map((row) => row.sourceId));
  for (const row of staged) {
    docs.push(
      finalize({
        id: row.id,
        section: "Candidates",
        kind: row.kindLabel,
        title: row.name,
        subtitle: `${row.city}${row.country ? ` · ${row.country}` : ""} · ${row.status.replace(/_/g, " ")} · ${row.batchName}`,
        href: row.href,
        names: [row.name, row.city, row.country],
        keywords: ["needs review", "candidate", row.status.replace(/_/g, " ")],
      }),
    );
  }

  for (const row of listSourcePackSearchRows()) {
    if (stagedIds.has(row.sourceId)) continue;
    docs.push(
      finalize({
        id: row.id,
        section: "Candidates",
        kind: row.kindLabel,
        title: row.name,
        subtitle: `${row.city}${row.country ? ` · ${row.country}` : ""} · ${row.batchName}`,
        href: row.href,
        names: [row.name, row.city, row.country, row.destination],
        keywords: ["needs review", "candidate", "pack", row.kind],
      }),
    );
  }
}

export function toAdminHit(doc: AdminSearchDocument, matchRank: number): AdminHit {
  return {
    id: doc.id,
    section: doc.section,
    kind: doc.kind,
    title: doc.title,
    subtitle: doc.subtitle,
    href: doc.href,
    matchRank,
  };
}
