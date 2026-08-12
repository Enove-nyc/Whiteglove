/**
 * Admin-only queue of listing candidates that still need verification.
 *
 * Combines staged ContentImportCandidate rows with private source packs under
 * data/imports that are not yet in the database. Nothing here publishes,
 * invents public copy, or surfaces map-derived candidates.
 */

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { whiteGloveEuropeCandidates } from "@/data/imports/white-glove-europe-batch/candidates";
import { whiteGloveFillCandidates } from "@/data/imports/white-glove-fill-batch/candidates";
import { whiteGloveGlobalCandidates } from "@/data/imports/white-glove-global-batch/candidates";
import { worldwideBatch2Candidates } from "@/data/imports/worldwide-batch-2/candidates";
import { worldwideBatch3Candidates } from "@/data/imports/worldwide-batch-3/candidates";
import { worldwideBatch4Candidates } from "@/data/imports/worldwide-batch-4/candidates";
import { worldwideBatch5Candidates } from "@/data/imports/worldwide-batch-5/candidates";
import { isDisallowedImportSource, type BulkContentKind } from "@/lib/bulk-content";
import { getContentImportDashboard, type ContentImportCandidateView } from "@/lib/content-imports";
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

const KNOWN_PACKS: readonly KnownPack[] = [
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
  {
    slug: "white-glove-fill-batch",
    name: "White Glove complementary fill pack",
    path: "data/imports/white-glove-fill-batch",
    href: "/admin/imports",
    note: "Private source pack — open Bulk imports to stage and review.",
    loadCandidates: () =>
      whiteGloveFillCandidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        // The pack's own schema admits one readiness and it is NEEDS_REVIEW,
        // so there is nothing here to ask about.
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
  {
    slug: "white-glove-europe-batch",
    name: "White Glove Europe research pack",
    path: "data/imports/white-glove-europe-batch",
    href: "/admin/imports",
    note: "Private source pack — open Bulk imports to stage and review.",
    loadCandidates: () =>
      whiteGloveEuropeCandidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.kind),
        market: candidate.market,
        destination: candidate.destination || candidate.city,
        city: candidate.city,
        country: candidate.country,
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
  {
    slug: "white-glove-global-batch",
    name: "White Glove global research pack",
    path: "data/imports/white-glove-global-batch",
    href: "/admin/imports",
    note: "Private source pack — open Bulk imports to stage and review.",
    loadCandidates: () =>
      whiteGloveGlobalCandidates.map((candidate) => ({
        sourceId: candidate.sourceId,
        name: candidate.name,
        kind: kindFromImportKind(candidate.importKind),
        market: candidate.market,
        destination: candidate.destination || candidate.locality,
        city: candidate.locality,
        country: candidate.country,
        // Same as the fill pack: NEEDS_REVIEW is the only readiness it has.
        status: "NEEDS_REVIEW",
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        attribution: candidate.sourceAttribution,
      })),
  },
];

function allowedPackCandidate(candidate: PackCandidate): boolean {
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
    href: `/admin/imports/${candidate.id}`,
    publishBlockers: candidate.publishBlockers.length,
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
    publishBlockers: 0,
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

  const open = items.filter((item) => item.status === "NEEDS_REVIEW" || item.status === "AWAITING_VERIFICATION" || item.status === "DUPLICATE");
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

    const packs: PrivateImportPackSummary[] = KNOWN_PACKS.map((pack) => {
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
    for (const pack of KNOWN_PACKS) {
      if (stagedBatchSlugs.has(pack.slug)) continue;
      for (const candidate of pack.loadCandidates().filter(allowedPackCandidate)) {
        if (candidate.status !== "NEEDS_REVIEW") continue;
        if (stagedSourceIds.has(candidate.sourceId)) continue;
        packItems.push(fromPack(pack, candidate));
      }
    }

    const items = [...dbItems, ...packItems].sort((a, b) =>
      a.name.localeCompare(b.name, "en") || a.batchName.localeCompare(b.batchName, "en") || a.id.localeCompare(b.id, "en"),
    );

    return {
      configured: dashboard.configured,
      databaseReady: dashboard.databaseReady,
      items,
      packs,
      counts: tally(items.filter((item) => item.status !== "PUBLISHED" && item.status !== "REJECTED")),
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
