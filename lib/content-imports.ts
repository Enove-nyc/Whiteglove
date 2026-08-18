/**
 * Database bridge for source-backed bulk imports.
 *
 * The collector writes a checked-in source package; this module is the only
 * code that stages that package or turns one reviewed candidate into an owned
 * listing. In particular, it never calls a public create function while
 * staging. A database outage therefore leaves the public directories exactly
 * as they were.
 */

import { attractions } from "@/data/attractions";
import {
  BUILT_IN_CONTENT_IMPORT_PACKAGES,
  type BuiltInContentImportPackage,
} from "@/data/imports";
import { kosherEateries } from "@/data/kosher-eateries";
import { kosherStays } from "@/data/kosher-stays";
import {
  bulkContentKindLabel,
  contentImportCandidatePath,
  findBulkContentDuplicate,
  isDisallowedImportSource,
  prepareBulkContentCandidate,
  type BulkContentCandidateInput,
  type BulkContentKind,
  type KnownContentRecord,
  type PreparedBulkContentCandidate,
  isTemplateFillerCandidate,
} from "@/lib/bulk-content";
import { bustTag } from "@/lib/cache-tags";
import { createAttraction, createKosherStay, isDbEnabled } from "@/lib/content-admin";
import {
  keepBothIdsFromEvidence,
  mergeKeepBothEvidence,
  noteListWithAliases,
  notesWithAliases,
  parseDuplicateTarget,
  recordKeepBoth,
  uniqueAliases,
} from "@/lib/import-duplicate-resolution";
import { invalidateSiteSearchIndex } from "@/lib/site-search-index";
import { PRACTICAL_PLACES_PUBLIC_TAG } from "@/lib/mikvaos";

const DB_OFF_MESSAGE = "Connect the private content database before staging source candidates.";

export type ContentImportStatus = "NEEDS_REVIEW" | "DUPLICATE" | "REJECTED" | "PUBLISHED";

export type ContentImportCandidateView = {
  id: string;
  batchSlug: string;
  batchName: string;
  kind: BulkContentKind;
  kindLabel: string;
  category: string | null;
  name: string;
  aliases: string[];
  city: string;
  region: string | null;
  country: string;
  destinationSlug: string | null;
  address: string | null;
  coordinates: string | null;
  website: string | null;
  summary: string | null;
  anchorName: string | null;
  anchorCoords: string | null;
  kosherClaim: string;
  kosherSourceUrl: string | null;
  sourceUrl: string;
  sourceId: string;
  sourceName: string;
  attribution: string;
  license: string | null;
  status: ContentImportStatus;
  publishBlockers: string[];
  duplicateOf: string | null;
  publishedKind: string | null;
  publishedId: string | null;
  sourceEvidence: unknown;
};

export type ContentImportBatchView = {
  slug: string;
  name: string;
  sourceName: string;
  sourceUrl: string;
  attribution: string;
  license: string | null;
  generatedAt: string;
  packageCandidates: number;
  stagedCandidates: number;
};

export type ContentImportCounts = {
  readyToStage: number;
  needsReview: number;
  publishable: number;
  duplicates: number;
  rejected: number;
  published: number;
};

export type ContentImportDashboard = {
  configured: boolean;
  databaseReady: boolean;
  batches: ContentImportBatchView[];
  candidates: ContentImportCandidateView[];
  counts: ContentImportCounts;
};

type StorageCandidate = Omit<ContentImportCandidateView, "batchSlug" | "batchName" | "kindLabel" | "publishBlockers"> & {
  batch: { slug: string; name: string };
  validationErrors: string[];
};

async function db() {
  if (!isDbEnabled()) throw new Error(DB_OFF_MESSAGE);
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

function packageCandidates(sourcePackage: BuiltInContentImportPackage): PreparedBulkContentCandidate[] {
  if (isDisallowedImportSource(sourcePackage.batch)) return [];
  return sourcePackage.candidates
    // Template placeholders that name no real place never enter the queue —
    // see isTemplateFillerCandidate in lib/bulk-content.ts for what and why.
    .filter((candidate) => !isTemplateFillerCandidate(candidate.name))
    .map(prepareBulkContentCandidate)
    .filter((candidate) => candidate.canStage);
}

/** A batch's real candidate count, with the template filler taken out. */
function realCandidateCount(sourcePackage: BuiltInContentImportPackage): number {
  return sourcePackage.candidates.filter((candidate) => !isTemplateFillerCandidate(candidate.name)).length;
}

function packageBatch(sourcePackage: BuiltInContentImportPackage): ContentImportBatchView {
  return {
    slug: sourcePackage.batch.slug,
    name: sourcePackage.batch.name,
    sourceName: sourcePackage.batch.sourceName,
    sourceUrl: sourcePackage.batch.sourceUrl,
    attribution: sourcePackage.batch.attribution,
    license: sourcePackage.batch.license,
    generatedAt: sourcePackage.generatedAt,
    packageCandidates: realCandidateCount(sourcePackage),
    stagedCandidates: 0,
  };
}

function viewFromPrepared(
  sourcePackage: BuiltInContentImportPackage,
  candidate: PreparedBulkContentCandidate,
): ContentImportCandidateView {
  return {
    id: candidate.dedupeKey,
    batchSlug: sourcePackage.batch.slug,
    batchName: sourcePackage.batch.name,
    kind: candidate.kind,
    kindLabel: bulkContentKindLabel(candidate.kind),
    category: candidate.category,
    name: candidate.name,
    aliases: candidate.aliases,
    city: candidate.city,
    region: candidate.region,
    country: candidate.country,
    destinationSlug: candidate.destinationSlug,
    address: candidate.address,
    coordinates: candidate.coordinates,
    website: candidate.website,
    summary: candidate.summary,
    anchorName: candidate.anchorName,
    anchorCoords: candidate.anchorCoords,
    kosherClaim: candidate.kosherClaim,
    kosherSourceUrl: candidate.kosherSourceUrl,
    sourceUrl: candidate.sourceUrl,
    sourceId: candidate.sourceId,
    sourceName: candidate.sourceName,
    attribution: candidate.attribution,
    license: candidate.license,
    status: "NEEDS_REVIEW",
    publishBlockers: candidate.publishBlockers,
    duplicateOf: null,
    publishedKind: null,
    publishedId: null,
    sourceEvidence: candidate.sourceEvidence,
  };
}

function viewFromStored(candidate: StorageCandidate): ContentImportCandidateView {
  return {
    id: candidate.id,
    batchSlug: candidate.batch.slug,
    batchName: candidate.batch.name,
    kind: candidate.kind,
    kindLabel: bulkContentKindLabel(candidate.kind),
    category: candidate.category,
    name: candidate.name,
    aliases: candidate.aliases,
    city: candidate.city,
    region: candidate.region,
    country: candidate.country,
    destinationSlug: candidate.destinationSlug,
    address: candidate.address,
    coordinates: candidate.coordinates,
    website: candidate.website,
    summary: candidate.summary,
    anchorName: candidate.anchorName,
    anchorCoords: candidate.anchorCoords,
    kosherClaim: candidate.kosherClaim,
    kosherSourceUrl: candidate.kosherSourceUrl,
    sourceUrl: candidate.sourceUrl,
    sourceId: candidate.sourceId,
    sourceName: candidate.sourceName,
    attribution: candidate.attribution,
    license: candidate.license,
    status: candidate.status,
    publishBlockers: candidate.validationErrors,
    duplicateOf: candidate.duplicateOf,
    publishedKind: candidate.publishedKind,
    publishedId: candidate.publishedId,
    sourceEvidence: candidate.sourceEvidence,
  };
}

function countsFor(candidates: readonly ContentImportCandidateView[], readyToStage = 0): ContentImportCounts {
  return {
    readyToStage,
    needsReview: candidates.filter((candidate) => candidate.status === "NEEDS_REVIEW").length,
    publishable: candidates.filter((candidate) => candidate.status === "NEEDS_REVIEW" && candidate.publishBlockers.length === 0).length,
    duplicates: candidates.filter((candidate) => candidate.status === "DUPLICATE").length,
    rejected: candidates.filter((candidate) => candidate.status === "REJECTED").length,
    published: candidates.filter((candidate) => candidate.status === "PUBLISHED").length,
  };
}

function staticOwnedContent(): KnownContentRecord[] {
  return [
    ...attractions.map((item) => ({
      id: `attraction:${item.slug}`,
      kind: "EXISTING" as const,
      name: item.name,
      city: item.city,
      country: item.country,
      sourceUrl: item.sourceUrl,
    })),
    ...kosherStays.map((item) => ({
      id: `stay:${item.slug}`,
      kind: "EXISTING" as const,
      name: item.name,
      city: item.city,
      country: item.country,
      sourceUrl: item.sourceUrl,
    })),
    ...kosherEateries.map((item) => ({
      id: `food:${item.slug}`,
      kind: "EXISTING" as const,
      name: item.name,
      city: item.city,
      country: item.country,
      sourceUrl: item.sourceUrl,
    })),
  ];
}

async function databaseOwnedContent(): Promise<KnownContentRecord[]> {
  const prisma = await db();
  const [attractionRows, stayRows, placeRows] = await Promise.all([
    prisma.attraction.findMany({ select: { id: true, name: true, city: true, country: true, sourceUrl: true } }),
    prisma.kosherStay.findMany({ select: { id: true, name: true, city: true, country: true, sourceUrl: true } }),
    prisma.practicalPlace.findMany({
      select: { id: true, name: true, sourceUrl: true, destination: { select: { city: true, country: true } } },
    }),
  ]);

  return [
    ...attractionRows.map((item) => ({ ...item, id: `attraction:${item.id}`, kind: "EXISTING" as const })),
    ...stayRows.map((item) => ({ ...item, id: `stay:${item.id}`, kind: "EXISTING" as const })),
    ...placeRows.map((item) => ({
      id: `place:${item.id}`,
      kind: "EXISTING" as const,
      name: item.name,
      city: item.destination.city,
      country: item.destination.country,
      sourceUrl: item.sourceUrl,
    })),
  ];
}

function rawSourceEvidence(value: unknown) {
  // Prisma accepts a JSON value here. The round trip avoids leaking a class,
  // undefined property, or arbitrary prototype from a collector into storage.
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as never;
}

function storedInput(candidate: ContentImportCandidateView): BulkContentCandidateInput {
  return {
    kind: candidate.kind,
    category: candidate.category,
    name: candidate.name,
    aliases: candidate.aliases,
    city: candidate.city,
    region: candidate.region,
    country: candidate.country,
    destinationSlug: candidate.destinationSlug,
    address: candidate.address,
    coordinates: candidate.coordinates,
    website: candidate.website,
    summary: candidate.summary,
    anchorName: candidate.anchorName,
    anchorCoords: candidate.anchorCoords,
    kosherClaim: candidate.kosherClaim,
    kosherSourceUrl: candidate.kosherSourceUrl,
    sourceUrl: candidate.sourceUrl,
    sourceId: candidate.sourceId,
    sourceName: candidate.sourceName,
    attribution: candidate.attribution,
    license: candidate.license,
    sourceEvidence: candidate.sourceEvidence,
  };
}

/** Source package + persisted queue. A failed DB read intentionally exposes no pseudo-published data. */
export async function getContentImportDashboard(): Promise<ContentImportDashboard> {
  const packageRows = BUILT_IN_CONTENT_IMPORT_PACKAGES.flatMap((sourcePackage) =>
    packageCandidates(sourcePackage).map((candidate) => viewFromPrepared(sourcePackage, candidate)),
  );
  const packageBatches = BUILT_IN_CONTENT_IMPORT_PACKAGES.map(packageBatch);
  if (!isDbEnabled()) {
    return {
      configured: false,
      databaseReady: false,
      batches: packageBatches,
      candidates: packageRows,
      counts: countsFor(packageRows, packageRows.length),
    };
  }

  try {
    const prisma = await db();
    const [batches, rows] = await Promise.all([
      prisma.contentImportBatch.findMany({
        include: { _count: { select: { candidates: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentImportCandidate.findMany({
        include: { batch: { select: { slug: true, name: true } } },
        orderBy: [{ status: "asc" }, { country: "asc" }, { city: "asc" }, { name: "asc" }],
      }),
    ]);
    const importedBatches = batches
      .map((item) => ({
        slug: item.slug,
        name: item.name,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        attribution: item.attribution,
        license: item.license,
        generatedAt: item.createdAt.toISOString(),
        packageCandidates: item._count.candidates,
        stagedCandidates: item._count.candidates,
      }))
      .filter((item) => !isDisallowedImportSource(item));
    const importedBySlug = new Map(importedBatches.map((item) => [item.slug, item]));
    const builtInSlugs = new Set(BUILT_IN_CONTENT_IMPORT_PACKAGES.map((item) => item.batch.slug));
    const batchesToShow = [
      ...BUILT_IN_CONTENT_IMPORT_PACKAGES.map((sourcePackage) => {
        const imported = importedBySlug.get(sourcePackage.batch.slug);
        return imported
          ? { ...imported, packageCandidates: sourcePackage.candidates.length }
          : packageBatch(sourcePackage);
      }),
      ...importedBatches.filter((item) => !builtInSlugs.has(item.slug)),
    ];
    const readyToStage = BUILT_IN_CONTENT_IMPORT_PACKAGES
      .filter((sourcePackage) => !importedBySlug.has(sourcePackage.batch.slug))
      .reduce((total, sourcePackage) => total + sourcePackage.candidates.length, 0);
    const candidateViews = (rows as unknown as StorageCandidate[])
      .map(viewFromStored)
      .filter((candidate) => !isDisallowedImportSource(candidate));
    return {
      configured: true,
      databaseReady: true,
      batches: batchesToShow,
      candidates: candidateViews,
      counts: countsFor(candidateViews, readyToStage),
    };
  } catch {
    // DATABASE_URL can be set before tables are provisioned. The source package
    // is still useful to inspect, but calling it staged would be dishonest.
    return {
      configured: true,
      databaseReady: false,
      batches: packageBatches,
      candidates: packageRows,
      counts: countsFor(packageRows, packageRows.length),
    };
  }
}

/**
 * Persist a checked-in source package without changing public tables. The
 * unique dedupe key makes it safe to run repeatedly, and a match against
 * existing owned content is held as DUPLICATE for an editor rather than
 * discarded.
 */
export async function stageBuiltInContentBatch(slug: string): Promise<{ created: number; total: number }> {
  const sourcePackage = BUILT_IN_CONTENT_IMPORT_PACKAGES.find((item) => item.batch.slug === slug);
  if (!sourcePackage) throw new Error("Unknown source package.");
  if (isDisallowedImportSource(sourcePackage.batch)) {
    throw new Error("This source package is not permitted for White Glove imports.");
  }
  const prisma = await db();
  const batch = await prisma.contentImportBatch.upsert({
    where: { slug: sourcePackage.batch.slug },
    create: {
      slug: sourcePackage.batch.slug,
      name: sourcePackage.batch.name,
      sourceName: sourcePackage.batch.sourceName,
      sourceUrl: sourcePackage.batch.sourceUrl,
      attribution: sourcePackage.batch.attribution,
      license: sourcePackage.batch.license,
      isBuiltIn: true,
    },
    update: {
      name: sourcePackage.batch.name,
      sourceName: sourcePackage.batch.sourceName,
      sourceUrl: sourcePackage.batch.sourceUrl,
      attribution: sourcePackage.batch.attribution,
      license: sourcePackage.batch.license,
      isBuiltIn: true,
    },
  });
  const existing = [...staticOwnedContent(), ...await databaseOwnedContent()];
  const rows = packageCandidates(sourcePackage).filter((candidate) => candidate.canStage).map((candidate) => {
    const duplicate = findBulkContentDuplicate(candidate, existing);
    return {
      batchId: batch.id,
      kind: candidate.kind,
      category: candidate.category,
      name: candidate.name,
      aliases: candidate.aliases,
      city: candidate.city,
      region: candidate.region,
      country: candidate.country,
      destinationSlug: candidate.destinationSlug,
      address: candidate.address,
      coordinates: candidate.coordinates,
      website: candidate.website,
      summary: candidate.summary,
      anchorName: candidate.anchorName,
      anchorCoords: candidate.anchorCoords,
      kosherClaim: candidate.kosherClaim,
      kosherSourceUrl: candidate.kosherSourceUrl,
      sourceUrl: candidate.sourceUrl,
      sourceId: candidate.sourceId,
      sourceName: candidate.sourceName,
      attribution: candidate.attribution,
      license: candidate.license,
      sourceEvidence: rawSourceEvidence(candidate.sourceEvidence),
      normalizedName: candidate.normalizedName,
      normalizedLocation: candidate.normalizedLocation,
      dedupeKey: candidate.dedupeKey,
      status: duplicate ? "DUPLICATE" as const : "NEEDS_REVIEW" as const,
      validationErrors: candidate.publishBlockers,
      duplicateOf: duplicate?.id ?? null,
    };
  });
  const result = await prisma.contentImportCandidate.createMany({ data: rows, skipDuplicates: true });
  return { created: result.count, total: rows.length };
}

export async function getContentImportCandidate(routeKey: string, candidateId?: string): Promise<ContentImportCandidateView | null> {
  if (!isDbEnabled()) return null;
  try {
    const prisma = await db();
    const byId = await prisma.contentImportCandidate.findUnique({
      where: { id: candidateId || routeKey },
      include: { batch: { select: { slug: true, name: true } } },
    });
    // A readable route may carry the database id only to disambiguate legacy
    // imports that reused a source id. Never let that id open a different
    // source record than the path says it represents.
    if (candidateId && byId?.sourceId !== routeKey) return null;
    const sourceMatches = byId ? [] : await prisma.contentImportCandidate.findMany({
      where: { sourceId: routeKey },
      include: { batch: { select: { slug: true, name: true } } },
      take: 2,
    });
    // Source IDs are intended to be stable candidate identities. Fail closed
    // if a legacy import reused one instead of opening an arbitrary row.
    const row = byId ?? (sourceMatches.length === 1 ? sourceMatches[0] : null);
    if (!row) return null;
    const candidate = viewFromStored(row as unknown as StorageCandidate);
    return isDisallowedImportSource(candidate) ? null : candidate;
  } catch {
    return null;
  }
}

/**
 * Rows the queue could plausibly match against — never the whole table.
 *
 * findBulkContentDuplicate only ever calls two things a duplicate: the same
 * sourceId, or the same normalized name+city+country. Both are stored columns
 * (sourceId, normalizedLocation), so the database can do the narrowing itself
 * instead of every row being pulled across the wire so JavaScript can throw
 * almost all of them away. A candidate pack runs to 15,000+ rows; comparing
 * one new row against the whole pack, every time it is edited, was reading
 * the entire queue out of Neon per edit — the actual cause of a month's
 * public network transfer allowance going to admin review work nobody
 * outside the team ever saw.
 */
async function possibleQueueDuplicates(
  prisma: Awaited<ReturnType<typeof db>>,
  candidate: PreparedBulkContentCandidate,
  ignoreCandidateId?: string,
) {
  const sourceId = candidate.sourceId.trim();
  const or: Array<Record<string, unknown>> = [{ normalizedLocation: candidate.normalizedLocation }];
  if (sourceId) or.push({ sourceId: { equals: sourceId, mode: "insensitive" } });
  if (candidate.sourceUrl.trim()) or.push({ sourceUrl: candidate.sourceUrl.trim() });

  return prisma.contentImportCandidate.findMany({
    where: {
      ...(ignoreCandidateId ? { id: { not: ignoreCandidateId } } : {}),
      OR: or,
    },
    select: { id: true, name: true, city: true, country: true, sourceUrl: true, sourceId: true },
    take: 200,
  });
}

async function ownedDuplicateFor(
  candidate: PreparedBulkContentCandidate,
  ignoreCandidateId?: string,
  ignoreIds?: ReadonlySet<string>,
): Promise<{ id: string; reason: string } | null> {
  const prisma = await db();
  const known = [...staticOwnedContent(), ...await databaseOwnedContent()];
  const owned = findBulkContentDuplicate(candidate, known, ignoreIds);
  if (owned) return owned;

  const queueRows = await possibleQueueDuplicates(prisma, candidate, ignoreCandidateId);
  const queued = findBulkContentDuplicate(candidate, queueRows.map((item) => ({
    ...item,
    id: `candidate:${item.id}`,
    kind: "EXISTING" as const,
  })), ignoreIds);
  return queued;
}

/**
 * Update a private candidate. Missing source fields are rejected rather than
 * saved as an orphaned draft; incomplete editorial fields remain visible as
 * publish blockers.
 */
export async function updateContentImportCandidate(id: string, input: BulkContentCandidateInput): Promise<ContentImportCandidateView> {
  const prepared = prepareBulkContentCandidate(input);
  if (!prepared.canStage) throw new Error(prepared.stageErrors.join(" "));
  const prisma = await db();
  const existing = await prisma.contentImportCandidate.findUnique({ where: { id }, select: { sourceEvidence: true } });
  if (!existing) throw new Error("That import candidate no longer exists.");
  const evidence = mergeKeepBothEvidence(existing.sourceEvidence, prepared.sourceEvidence);
  const ignoreIds = new Set(keepBothIdsFromEvidence(evidence));
  const duplicate = await ownedDuplicateFor(prepared, id, ignoreIds);
  const flagged = duplicate && !ignoreIds.has(duplicate.id) ? duplicate : null;
  const row = await prisma.contentImportCandidate.update({
    where: { id },
    data: {
      kind: prepared.kind,
      category: prepared.category,
      name: prepared.name,
      aliases: prepared.aliases,
      city: prepared.city,
      region: prepared.region,
      country: prepared.country,
      destinationSlug: prepared.destinationSlug,
      address: prepared.address,
      coordinates: prepared.coordinates,
      website: prepared.website,
      summary: prepared.summary,
      anchorName: prepared.anchorName,
      anchorCoords: prepared.anchorCoords,
      kosherClaim: prepared.kosherClaim,
      kosherSourceUrl: prepared.kosherSourceUrl,
      sourceUrl: prepared.sourceUrl,
      sourceId: prepared.sourceId,
      sourceName: prepared.sourceName,
      attribution: prepared.attribution,
      license: prepared.license,
      sourceEvidence: rawSourceEvidence(evidence),
      normalizedName: prepared.normalizedName,
      normalizedLocation: prepared.normalizedLocation,
      dedupeKey: prepared.dedupeKey,
      status: flagged ? "DUPLICATE" : "NEEDS_REVIEW",
      validationErrors: prepared.publishBlockers,
      duplicateOf: flagged?.id ?? null,
      reviewedAt: new Date(),
    },
    include: { batch: { select: { slug: true, name: true } } },
  });
  return viewFromStored(row as unknown as StorageCandidate);
}

export async function setContentImportCandidateStatus(
  id: string,
  status: Extract<ContentImportStatus, "NEEDS_REVIEW" | "REJECTED" | "DUPLICATE">,
) {
  const prisma = await db();
  return prisma.contentImportCandidate.update({
    where: { id },
    data: { status, reviewedAt: new Date() },
  });
}

export async function keepBothContentImportCandidate(id: string): Promise<ContentImportCandidateView> {
  const prisma = await db();
  const stored = await prisma.contentImportCandidate.findUnique({
    where: { id },
    include: { batch: { select: { slug: true, name: true } } },
  });
  if (!stored) throw new Error("That import candidate no longer exists.");
  if (!stored.duplicateOf) throw new Error("This candidate is not flagged as a duplicate.");
  const evidence = recordKeepBoth(stored.sourceEvidence, stored.duplicateOf);
  const row = await prisma.contentImportCandidate.update({
    where: { id },
    data: {
      status: "NEEDS_REVIEW",
      duplicateOf: null,
      sourceEvidence: rawSourceEvidence(evidence),
      reviewedAt: new Date(),
    },
    include: { batch: { select: { slug: true, name: true } } },
  });
  return viewFromStored(row as unknown as StorageCandidate);
}

/**
 * Copy unique aliases onto the kept listing, then mark this candidate as a
 * duplicate. Never deletes either row, and never rewrites the kept listing's
 * other fields.
 */
export async function mergeContentImportCandidate(id: string): Promise<{ kept: string; aliasesAdded: number }> {
  const prisma = await db();
  const stored = await prisma.contentImportCandidate.findUnique({ where: { id } });
  if (!stored) throw new Error("That import candidate no longer exists.");
  const target = parseDuplicateTarget(stored.duplicateOf);
  if (!target) throw new Error("This candidate is not flagged as a duplicate.");

  const incoming = uniqueAliases([], stored.aliases.filter((alias) => alias.trim() && alias.trim() !== stored.name));
  let aliasesAdded = 0;
  let kept = stored.duplicateOf ?? target.key;

  if (target.kind === "candidate") {
    const other = await prisma.contentImportCandidate.findUnique({ where: { id: target.key } });
    if (!other) throw new Error("The other candidate is no longer there.");
    const next = uniqueAliases(other.aliases, incoming);
    aliasesAdded = next.length - other.aliases.length;
    if (aliasesAdded > 0) {
      await prisma.contentImportCandidate.update({ where: { id: other.id }, data: { aliases: next } });
    }
    kept = `candidate:${other.id}`;
  } else if (target.kind === "attraction") {
    const row = await prisma.attraction.findFirst({ where: { OR: [{ id: target.key }, { slug: target.key }] } });
    if (!row) throw new Error("The matching attraction is no longer there.");
    const notes = noteListWithAliases(row.notes, incoming);
    aliasesAdded = notes.length - row.notes.length;
    if (aliasesAdded > 0) await prisma.attraction.update({ where: { id: row.id }, data: { notes } });
    kept = `attraction:${row.slug}`;
  } else if (target.kind === "stay") {
    const row = await prisma.kosherStay.findFirst({ where: { OR: [{ id: target.key }, { slug: target.key }] } });
    if (!row) throw new Error("The matching place to stay is no longer there.");
    const notes = noteListWithAliases(row.notes, incoming);
    aliasesAdded = notes.length - row.notes.length;
    if (aliasesAdded > 0) await prisma.kosherStay.update({ where: { id: row.id }, data: { notes } });
    kept = `stay:${row.slug}`;
  } else if (target.kind === "place") {
    const row = await prisma.practicalPlace.findUnique({ where: { id: target.key } });
    if (!row) throw new Error("The matching listing is no longer there.");
    const notes = notesWithAliases(row.notes, incoming);
    aliasesAdded = notes === (row.notes ?? "").trim() ? 0 : incoming.length;
    if (notes !== (row.notes ?? "").trim()) {
      await prisma.practicalPlace.update({ where: { id: row.id }, data: { notes } });
    }
    kept = `place:${row.id}`;
  } else if (target.kind === "food") {
    kept = stored.duplicateOf ?? `food:${target.key}`;
  } else {
    throw new Error("This duplicate cannot be merged from here.");
  }

  await prisma.contentImportCandidate.update({
    where: { id },
    data: {
      status: "DUPLICATE",
      duplicateOf: kept,
      reviewedAt: new Date(),
    },
  });
  return { kept, aliasesAdded };
}

function linkedText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

function linkedUrl(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\/+$/, "").toLocaleLowerCase("en");
}

/**
 * Close a kosher import row only after the corresponding destination listing
 * has already been checked and published by an editor. This records the link;
 * it never creates a kosher claim from the import directory itself.
 */
export async function confirmLinkedKosherImportCandidate(id: string): Promise<{ kind: string; id: string }> {
  const prisma = await db();
  const stored = await prisma.contentImportCandidate.findUnique({
    where: { id },
    include: { batch: { select: { slug: true, name: true } } },
  });
  if (!stored) throw new Error("That import candidate no longer exists.");
  if (stored.kind !== "KOSHER_FOOD") throw new Error("Only kosher-food imports use the verified destination-link workflow.");
  if (stored.status !== "NEEDS_REVIEW" && stored.status !== "DUPLICATE") {
    throw new Error("Only a candidate still waiting for review can be linked.");
  }
  if (!stored.destinationSlug) throw new Error("Choose an existing destination before linking this verified listing.");

  const destination = await prisma.destination.findUnique({
    where: { slug: stored.destinationSlug },
    select: {
      places: {
        where: {
          category: { in: ["KOSHER_FOOD", "GROCERY"] },
          status: "PUBLISHED",
          verification: "VERIFIED",
        },
        select: { id: true, name: true, sourceUrl: true },
      },
    },
  });
  if (!destination) throw new Error("That destination does not exist.");

  const candidateName = linkedText(stored.name);
  const evidenceUrls = new Set([linkedUrl(stored.kosherSourceUrl), linkedUrl(stored.sourceUrl)].filter(Boolean));
  const place = destination.places.find((item) =>
    linkedText(item.name) === candidateName && evidenceUrls.has(linkedUrl(item.sourceUrl)),
  );
  if (!place) {
    throw new Error("No published, verified destination listing has the same name and certification source URL.");
  }

  await prisma.contentImportCandidate.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedKind: "food",
      publishedId: place.id,
      publishedAt: new Date(),
      reviewedAt: new Date(),
      validationErrors: [],
      duplicateOf: null,
    },
  });
  return { kind: "food", id: place.id };
}

/**
 * Publish one reviewed candidate, never a whole batch. Kosher food remains a
 * deliberate exception: a source directory can create a review lead but may
 * not, by itself, create a public kosher claim.
 */
export async function publishContentImportCandidate(id: string): Promise<{ kind: string; id: string }> {
  const prisma = await db();
  const stored = await prisma.contentImportCandidate.findUnique({
    where: { id },
    include: { batch: { select: { slug: true, name: true } } },
  });
  if (!stored) throw new Error("That import candidate no longer exists.");
  if (stored.status !== "NEEDS_REVIEW") throw new Error("Only a candidate waiting for review can be published.");
  const candidate = viewFromStored(stored as unknown as StorageCandidate);
  const prepared = prepareBulkContentCandidate(storedInput(candidate));
  if (!prepared.canPublish) throw new Error(prepared.publishBlockers.join(" "));
  const duplicate = await ownedDuplicateFor(prepared, id);
  if (duplicate) throw new Error(`This appears to duplicate ${duplicate.id}. Resolve it in the review queue instead of publishing another listing.`);

  let published: { kind: string; id: string };
  const sourceNote = `Source: ${prepared.attribution}${prepared.license ? ` (${prepared.license})` : ""}.`;
  if (prepared.kind === "ATTRACTION") {
    const row = await createAttraction({
      name: prepared.name,
      city: prepared.city,
      country: prepared.country,
      kind: prepared.category ?? "Landmark",
      summary: prepared.summary ?? "",
      address: prepared.address,
      coordinates: prepared.coordinates,
      website: prepared.website,
      notes: [sourceNote],
      sourceUrl: prepared.sourceUrl,
    });
    published = { kind: "attraction", id: row.slug };
  } else if (prepared.kind === "PLACE_TO_STAY") {
    const row = await createKosherStay({
      name: prepared.name,
      city: prepared.city,
      country: prepared.country,
      kind: prepared.category ?? "Ordinary hotel, well placed",
      summary: prepared.summary ?? "",
      anchorName: prepared.anchorName ?? "",
      anchorCoords: prepared.anchorCoords ?? "",
      season: null,
      kosherClaim: prepared.kosherClaim,
      website: prepared.website,
      notes: [sourceNote],
      sourceUrl: prepared.sourceUrl,
    });
    published = { kind: "stay", id: row.slug };
  } else if (prepared.kind === "KOSHER_FOOD") {
    // This remains unreachable because prepareBulkContentCandidate blocks it.
    // Keeping the explicit error makes a future validator change fail closed.
    throw new Error("Kosher food must be confirmed in the destination editor before it can be public.");
  } else {
    const destination = prepared.destinationSlug
      ? await prisma.destination.findUnique({ where: { slug: prepared.destinationSlug }, select: { id: true } })
      : null;
    if (!destination) throw new Error("Choose an existing destination before publishing this practical listing.");
    const row = await prisma.practicalPlace.create({
      data: {
        category: prepared.category as never,
        name: prepared.name,
        address: prepared.address,
        website: prepared.website,
        coordinates: prepared.coordinates,
        notes: `${prepared.summary}\n\n${sourceNote}`,
        status: "PUBLISHED",
        verification: "VERIFIED",
        sourceUrl: prepared.sourceUrl,
        lastVerified: new Date(),
        destinationId: destination.id,
      },
      select: { id: true },
    });
    invalidateSiteSearchIndex();
    await bustTag(PRACTICAL_PLACES_PUBLIC_TAG);
    published = { kind: "practical", id: row.id };
  }

  await prisma.contentImportCandidate.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedKind: published.kind,
      publishedId: published.id,
      publishedAt: new Date(),
      reviewedAt: new Date(),
      validationErrors: [],
    },
  });
  return published;
}

/** Staged review rows for admin search. Empty when the database is off. */
export async function listStagedCandidatesForAdminSearch(): Promise<
  Array<{
    id: string;
    name: string;
    kindLabel: string;
    city: string;
    country: string;
    status: ContentImportStatus;
    sourceId: string;
    href: string;
    batchName: string;
  }>
> {
  if (!isDbEnabled()) return [];
  try {
    const prisma = await db();
    const rows = await prisma.contentImportCandidate.findMany({
      where: { status: { in: ["NEEDS_REVIEW", "DUPLICATE"] } },
      select: {
        id: true,
        name: true,
        kind: true,
        city: true,
        country: true,
        status: true,
        sourceId: true,
        sourceUrl: true,
        sourceName: true,
        attribution: true,
        batch: { select: { name: true } },
      },
    });
    return rows
      .filter((row) => !isDisallowedImportSource(row))
      .map((row) => ({
        id: `db:${row.id}`,
        name: row.name,
        kindLabel: row.kind === "PLACE_TO_STAY" ? "Where to stay" : bulkContentKindLabel(row.kind),
        city: row.city,
        country: row.country,
        status: row.status,
        sourceId: row.sourceId,
        href: contentImportCandidatePath(row.sourceId, row.id),
        batchName: row.batch.name,
      }));
  } catch {
    return [];
  }
}
