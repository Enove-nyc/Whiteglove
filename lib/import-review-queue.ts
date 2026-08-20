/**
 * Admin-only queue of listing candidates that still need verification.
 *
 * Combines staged ContentImportCandidate rows with private source packs under
 * data/imports that are not yet in the database. Nothing here publishes,
 * invents public copy, or surfaces map-derived candidates.
 */

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { worldwideBatch2Candidates } from "@/data/imports/worldwide-batch-2/candidates";
import { worldwideBatch3Candidates } from "@/data/imports/worldwide-batch-3/candidates";
import { worldwideBatch4Candidates } from "@/data/imports/worldwide-batch-4/candidates";
import { worldwideBatch5Candidates } from "@/data/imports/worldwide-batch-5/candidates";
import { kosherFoodBatchCandidates } from "@/data/imports/kosher-food-batch/candidates";
import { nesiyatovaHeritageCandidates } from "@/data/imports/nesiyatova-heritage-batch/candidates";
import {
  contentImportCandidatePath,
  isDisallowedImportSource,
  isGeneratedDraftCandidate,
  isTemplateFillerCandidate,
  type BulkContentKind,
} from "@/lib/bulk-content";
import {
  createOnSiteMatcher,
  getContentImportDashboard,
  RETIRED_IMPORT_BATCH_SLUGS,
  type ContentImportCandidateView,
} from "@/lib/content-imports";
import {
  isOpenReviewStatus,
  reviewQueueKindLabel,
  reviewQueueStatusLabel,
  type ImportReviewQueue,
  type ImportReviewQueueCounts,
  type PrivateImportPackSummary,
  type ReviewQueueItem,
  type ReviewQueueItemStatus,
  type ReviewQueueKind,
} from "@/lib/review-queue";

// The shape and the labels live in lib/review-queue.ts so the screen can read
// them without this module's filesystem work. Re-exported here because the
// callers that build the queue want both from one place.
export {
  isOpenReviewStatus,
  reviewQueueKindLabel,
  reviewQueueStatusLabel,
  type ImportReviewQueue,
  type ImportReviewQueueCounts,
  type PrivateImportPackSummary,
  type ReviewQueueItem,
  type ReviewQueueItemStatus,
  type ReviewQueueKind,
};

type PackCandidate = {
  sourceId: string;
  name: string;
  kind: ReviewQueueKind;
  market: string;
  destination: string;
  city: string;
  country: string;
  status: "NEEDS_REVIEW" | "PUBLISHED";
  sourceUrl: string;
  sourceName: string;
  attribution: string;
  /** The prefilled summary, where the pack carries one — used to spot generator drafts. */
  summary?: string | null;
};

type KnownPack = {
  slug: string;
  name: string;
  path: string;
  href: string;
  note: string;
  loadCandidates: () => readonly PackCandidate[];
};

function kindFromBulk(kind: BulkContentKind): ReviewQueueKind {
  if (kind === "ATTRACTION") return "attraction";
  if (kind === "PLACE_TO_STAY") return "stay";
  if (kind === "KOSHER_FOOD") return "food";
  return "practical";
}

function kindFromImportKind(kind: string): ReviewQueueKind {
  if (kind === "ATTRACTION") return "attraction";
  if (kind === "PLACE_TO_STAY") return "stay";
  if (kind === "KOSHER_FOOD") return "food";
  return "practical";
}

function emptyCounts(): ImportReviewQueueCounts {
  return {
    awaitingVerification: 0,
    needsReview: 0,
    duplicates: 0,
    sourcePackOnly: 0,
    byKind: { attraction: 0, stay: 0, food: 0, practical: 0 },
    byBatch: [],
    byMarket: [],
  };
}

/** The packs that still surface in the review queue — retired ones filtered out. */
function activePacks(): readonly KnownPack[] {
  return KNOWN_PACKS.filter((pack) => !RETIRED_IMPORT_BATCH_SLUGS.has(pack.slug));
}

const KNOWN_PACKS: readonly KnownPack[] = [
  {
    slug: "nesiyatova-heritage-batch",
    name: "Nesiya Tova beis hachaim, mikvah and hachnasas orchim pack",
    path: "data/imports/nesiyatova-heritage-batch",
    href: "/admin/imports",
    note: "Private heritage / practical leads from Nesiya Tova — open Bulk imports to stage. Nothing publishes until you verify each one.",
    loadCandidates: () =>
      nesiyatovaHeritageCandidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
  {
    slug: "kosher-food-batch",
    name: "Kosher food finder review pack",
    path: "data/imports/kosher-food-batch",
    href: "/admin/imports",
    note: "Private kosher food leads — open Bulk imports to stage. Nothing publishes until you verify each one.",
    loadCandidates: () =>
      kosherFoodBatchCandidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
  {
    slug: "worldwide-batch-5",
    name: "Worldwide editorial review pack 5",
    path: "data/imports/worldwide-batch-5",
    href: "/admin/imports",
    note: "Private source pack — open Bulk imports to stage and review. Prefills category, summary and address.",
    loadCandidates: () =>
      worldwideBatch5Candidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
  {
    slug: "worldwide-batch-4",
    name: "Worldwide editorial review pack 4",
    path: "data/imports/worldwide-batch-4",
    href: "/admin/imports",
    note: "Private source pack — open Bulk imports to stage and review. Prefills category, summary and address.",
    loadCandidates: () =>
      worldwideBatch4Candidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
        summary: candidate.summary,
      })),
  },
  {
    slug: "worldwide-batch-3",
    name: "Worldwide editorial review pack 3",
    path: "data/imports/worldwide-batch-3",
    href: "/admin/imports",
    note: "Private source pack — open Bulk imports to stage and review. Prefills category, summary and address.",
    loadCandidates: () =>
      worldwideBatch3Candidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
        summary: candidate.summary,
      })),
  },
  {
    slug: "worldwide-batch-2",
    name: "Worldwide editorial review pack",
    path: "data/imports/worldwide-batch-2",
    href: "/admin/imports/trello",
    note: "Editorial pack — open Trello review cards, or Bulk imports once staged.",
    loadCandidates: () =>
      worldwideBatch2Candidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        status: candidate.publicationReadiness === "PUBLISHED" ? "PUBLISHED" : "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
  // The three "White Glove research / fill" packs (europe, global, fill) were
  // retired at the owner's decision. They held ~1,500 bare place-names — a name,
  // a city and a source link, with no coordinates, address or description — a
  // research to-do list, not reviewable listings. They kept the Needs review
  // count high while offering nothing that could be published without authoring
  // the whole entry by hand. Their directories under data/imports/ were removed
  // with them so they cannot reappear as unregistered pack folders.
];

function allowedPackCandidate(candidate: PackCandidate): boolean {
  // Template placeholders that name no real place are dropped before they
  // reach the queue or its counts — see isTemplateFillerCandidate.
  if (isTemplateFillerCandidate(candidate.name)) return false;
  // Machine-generated research drafts, told by their boilerplate summary, are
  // not real listings and are cleared from the queue and its counts too.
  if (isGeneratedDraftCandidate(candidate.summary)) return false;
  return !isDisallowedImportSource({
    sourceUrl: candidate.sourceUrl,
    sourceName: candidate.sourceName,
    attribution: candidate.attribution,
  });
}

function fromDatabase(candidate: ContentImportCandidateView): ReviewQueueItem {
  const kind = kindFromBulk(candidate.kind);
  return {
    id: `db:${candidate.id}`,
    name: candidate.name,
    kind,
    kindLabel: reviewQueueKindLabel(kind),
    status: candidate.status,
    statusLabel: reviewQueueStatusLabel(candidate.status),
    market: candidate.destinationSlug || candidate.country,
    destination: [candidate.city, candidate.region, candidate.country].filter(Boolean).join(", "),
    city: candidate.city,
    country: candidate.country,
    batchSlug: candidate.batchSlug,
    batchName: candidate.batchName,
    origin: "database",
    href: contentImportCandidatePath(candidate.sourceId, candidate.id),
    duplicateOf: candidate.duplicateOf,
    publishBlockers: candidate.publishBlockers.length,
    aliases: candidate.aliases,
    address: candidate.address ?? "",
    coordinates: candidate.coordinates ?? "",
    sourceUrl: candidate.sourceUrl,
    sourceName: candidate.sourceName,
    website: candidate.website ?? "",
    region: candidate.region ?? "",
  };
}

function fromPack(pack: KnownPack, candidate: PackCandidate): ReviewQueueItem {
  return {
    id: `pack:${pack.slug}:${candidate.sourceId}`,
    name: candidate.name,
    kind: candidate.kind,
    kindLabel: reviewQueueKindLabel(candidate.kind),
    status: "AWAITING_VERIFICATION",
    statusLabel: reviewQueueStatusLabel("AWAITING_VERIFICATION"),
    market: candidate.market,
    destination: candidate.destination,
    city: candidate.city,
    country: candidate.country,
    batchSlug: pack.slug,
    batchName: pack.name,
    origin: "source_pack",
    href: pack.href,
    duplicateOf: null,
    publishBlockers: 0,
    aliases: [],
    address: "",
    coordinates: "",
    sourceUrl: candidate.sourceUrl,
    sourceName: candidate.sourceName,
    website: "",
    region: "",
  };
}

function tally(items: readonly ReviewQueueItem[]): ImportReviewQueueCounts {
  const byKind: Record<ReviewQueueKind, number> = { attraction: 0, stay: 0, food: 0, practical: 0 };
  const batchMap = new Map<string, { slug: string; name: string; count: number }>();
  const marketMap = new Map<string, number>();

  for (const item of items) {
    byKind[item.kind] += 1;
    const batch = batchMap.get(item.batchSlug) ?? { slug: item.batchSlug, name: item.batchName, count: 0 };
    batch.count += 1;
    batchMap.set(item.batchSlug, batch);
    const market = item.market.trim() || "Unspecified";
    marketMap.set(market, (marketMap.get(market) ?? 0) + 1);
  }

  // Duplicates are NOT awaiting verification — a place already on the site is
  // done, not outstanding. It is counted under `duplicates`, not here.
  const open = items.filter((item) => item.status === "NEEDS_REVIEW" || item.status === "AWAITING_VERIFICATION");
  return {
    awaitingVerification: open.length,
    needsReview: items.filter((item) => item.status === "NEEDS_REVIEW").length,
    duplicates: items.filter((item) => item.status === "DUPLICATE").length,
    sourcePackOnly: items.filter((item) => item.origin === "source_pack").length,
    byKind,
    byBatch: [...batchMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en")),
    byMarket: [...marketMap.entries()]
      .map(([market, count]) => ({ market, count }))
      .sort((a, b) => b.count - a.count || a.market.localeCompare(b.market, "en")),
  };
}

function discoverUnregisteredPackDirs(): string[] {
  const root = join(process.cwd(), "data", "imports");
  if (!existsSync(root)) return [];
  const known = new Set(KNOWN_PACKS.map((pack) => pack.slug));
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !known.has(entry.name) && entry.name !== "node_modules")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * Everything still waiting on verification, for the admin Needs review screen.
 * Source-pack rows are omitted once the same sourceId is already in the database.
 */
export async function getImportReviewQueue(): Promise<ImportReviewQueue> {
  try {
    const dashboard = await getContentImportDashboard();
    // ONLY when the database actually answered. `dashboard.candidates` carries
    // the source-package PREVIEW when it did not, and the two must not be
    // confused: a preview row has no database id, so treating it as staged
    // labels it "database", sends its review link to /admin/imports/<a key that
    // is in no table>, and suppresses the pack row that would have pointed
    // somewhere real. That was invisible while the built-in package list was
    // empty and the preview was always empty with it.
    const dbCandidates = dashboard.databaseReady
      ? dashboard.candidates.filter((candidate) => !isDisallowedImportSource(candidate))
      : [];
    const stagedSourceIds = new Set(dbCandidates.map((candidate) => candidate.sourceId));
    const stagedBatchSlugs = new Set(dashboard.batches.filter((batch) => batch.stagedCandidates > 0).map((batch) => batch.slug));

    const packs: PrivateImportPackSummary[] = activePacks().map((pack) => {
      const candidates = pack.loadCandidates().filter(allowedPackCandidate);
      const needsReviewCount = candidates.filter((candidate) => candidate.status === "NEEDS_REVIEW").length;
      const inDatabase = stagedBatchSlugs.has(pack.slug);
      return {
        slug: pack.slug,
        name: pack.name,
        path: pack.path,
        candidateCount: candidates.length,
        needsReviewCount,
        inDatabase,
        href: pack.href,
        note: inDatabase ? "Already staged in the private database queue." : pack.note,
      };
    });

    for (const slug of discoverUnregisteredPackDirs()) {
      packs.push({
        slug,
        name: slug.replace(/-/g, " "),
        path: `data/imports/${slug}`,
        candidateCount: 0,
        needsReviewCount: 0,
        inDatabase: stagedBatchSlugs.has(slug),
        href: "/admin/imports",
        note: "Folder present under data/imports — open Bulk imports once a reviewed package is registered.",
      });
    }

    const dbItems = dbCandidates.map(fromDatabase);
    const packItems: ReviewQueueItem[] = [];
    for (const pack of activePacks()) {
      if (stagedBatchSlugs.has(pack.slug)) continue;
      for (const candidate of pack.loadCandidates().filter(allowedPackCandidate)) {
        if (candidate.status !== "NEEDS_REVIEW") continue;
        if (stagedSourceIds.has(candidate.sourceId)) continue;
        packItems.push(fromPack(pack, candidate));
      }
    }

    // Reconcile every row — staged database candidate and source-pack lead
    // alike — against what is actually published, by the same rules the content
    // dashboard uses (createOnSiteMatcher). A lead whose place is already on the
    // site becomes a duplicate rather than something still awaiting
    // verification, so this screen's "needs review" and "possible duplicates"
    // match the numbers reported everywhere else instead of counting a
    // published place as still outstanding. Only rows that are genuinely still
    // open are flipped: a candidate an editor has already published, rejected
    // or marked a duplicate keeps the status it was given by hand.
    // A lead whose place is already on the site is auto-matched to it and marked
    // a duplicate "on-site" — that is not review work and there is nothing to do
    // with it, so it is dropped. A candidate flagged against another entry by an
    // editor or the staging check (duplicateOf is a real record id) is a genuine
    // possible duplicate and stays, so a mistaken re-entry still surfaces.
    const onSite = createOnSiteMatcher();
    const reconcile = (item: ReviewQueueItem): ReviewQueueItem => {
      const stillOpen = item.status === "NEEDS_REVIEW" || item.status === "AWAITING_VERIFICATION";
      if (!stillOpen) return item;
      return onSite({ name: item.name, city: item.city, country: item.country, sourceUrl: item.sourceUrl, coordinates: item.coordinates })
        ? { ...item, status: "DUPLICATE" as const, statusLabel: reviewQueueStatusLabel("DUPLICATE"), duplicateOf: "on-site" }
        : item;
    };
    const isAutoOnSiteDuplicate = (item: ReviewQueueItem) =>
      item.status === "DUPLICATE" && (item.duplicateOf === null || item.duplicateOf === "on-site");

    const items = [...dbItems.map(reconcile), ...packItems.map(reconcile)]
      .filter((item) => item.status !== "PUBLISHED" && item.status !== "REJECTED")
      .filter((item) => !isAutoOnSiteDuplicate(item))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "en") || a.batchName.localeCompare(b.batchName, "en") || a.id.localeCompare(b.id, "en"),
      );

    return {
      configured: dashboard.configured,
      databaseReady: dashboard.databaseReady,
      items,
      packs,
      counts: tally(items),
      error: null,
    };
  } catch (error) {
    return {
      configured: false,
      databaseReady: false,
      items: [],
      packs: [],
      counts: emptyCounts(),
      error: error instanceof Error ? error.message : "The review queue could not be loaded.",
    };
  }
}

/** Slim pack rows for admin search. Read-only — does not rewrite pack files. */
export type PackSearchRow = {
  id: string;
  name: string;
  kind: ReviewQueueKind;
  kindLabel: string;
  city: string;
  country: string;
  destination: string;
  status: string;
  batchSlug: string;
  batchName: string;
  sourceId: string;
  href: string;
};

export function listSourcePackSearchRows(): PackSearchRow[] {
  const out: PackSearchRow[] = [];
  for (const pack of activePacks()) {
    for (const candidate of pack.loadCandidates().filter(allowedPackCandidate)) {
      if (candidate.status === "PUBLISHED") continue;
      out.push({
        id: `pack:${pack.slug}:${candidate.sourceId}`,
        name: candidate.name,
        kind: candidate.kind,
        kindLabel: reviewQueueKindLabel(candidate.kind),
        city: candidate.city,
        country: candidate.country,
        destination: candidate.destination,
        status: candidate.status,
        batchSlug: pack.slug,
        batchName: pack.name,
        sourceId: candidate.sourceId,
        href: `/admin/imports/needs-review?q=${encodeURIComponent(candidate.name)}`,
      });
    }
  }
  return out;
}
