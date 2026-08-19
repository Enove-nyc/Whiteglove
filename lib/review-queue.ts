/**
 * The shape of the review queue, and what its statuses are called.
 *
 * Kept apart from lib/import-review-queue.ts for the same reason lib/changes.ts
 * is kept apart from lib/changes-store.ts: building the queue reads the source
 * packs off disk, so that module drags node:fs behind it. The screen that shows
 * the queue is a client component and needs only these types and the three
 * labels — importing them from the builder pulled the filesystem into the
 * browser bundle and the build stopped.
 */

export type ReviewQueueKind = "attraction" | "stay" | "food" | "practical";

export type ReviewQueueItemStatus =
  | "NEEDS_REVIEW"
  | "DUPLICATE"
  | "REJECTED"
  | "PUBLISHED"
  | "AWAITING_VERIFICATION";

export type ReviewQueueItem = {
  id: string;
  name: string;
  kind: ReviewQueueKind;
  kindLabel: string;
  status: ReviewQueueItemStatus;
  statusLabel: string;
  market: string;
  destination: string;
  city: string;
  country: string;
  batchSlug: string;
  batchName: string;
  origin: "database" | "source_pack";
  href: string;
  /**
   * What this candidate duplicates, when it is a duplicate. "on-site" means it
   * was auto-matched to a place already published — not real review work, so it
   * is dropped from the queue. A real record id means an editor or the staging
   * check flagged it against another entry — that is a genuine possible
   * duplicate and stays in the queue. null when it is not a duplicate.
   */
  duplicateOf: string | null;
  publishBlockers: number;
  aliases: string[];
  address: string;
  coordinates: string;
  sourceUrl: string;
  sourceName: string;
  website: string;
  region: string;
};

export type PrivateImportPackSummary = {
  slug: string;
  name: string;
  path: string;
  candidateCount: number;
  needsReviewCount: number;
  inDatabase: boolean;
  href: string;
  note: string;
};

export type ImportReviewQueueCounts = {
  awaitingVerification: number;
  needsReview: number;
  duplicates: number;
  sourcePackOnly: number;
  byKind: Record<ReviewQueueKind, number>;
  byBatch: Array<{ slug: string; name: string; count: number }>;
  byMarket: Array<{ market: string; count: number }>;
};

export type ImportReviewQueue = {
  configured: boolean;
  databaseReady: boolean;
  items: ReviewQueueItem[];
  packs: PrivateImportPackSummary[];
  counts: ImportReviewQueueCounts;
  error: string | null;
};

const KIND_LABEL: Record<ReviewQueueKind, string> = {
  attraction: "Attraction",
  stay: "Where to stay",
  food: "Kosher food",
  practical: "Practical",
};

const STATUS_LABEL: Record<ReviewQueueItemStatus, string> = {
  NEEDS_REVIEW: "Needs review",
  DUPLICATE: "Possible duplicate",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
  AWAITING_VERIFICATION: "Awaiting verification",
};

export function reviewQueueStatusLabel(status: ReviewQueueItemStatus): string {
  return STATUS_LABEL[status];
}

export function reviewQueueKindLabel(kind: ReviewQueueKind): string {
  return KIND_LABEL[kind];
}

export function isOpenReviewStatus(status: ReviewQueueItemStatus): boolean {
  return status === "NEEDS_REVIEW" || status === "AWAITING_VERIFICATION" || status === "DUPLICATE";
}
