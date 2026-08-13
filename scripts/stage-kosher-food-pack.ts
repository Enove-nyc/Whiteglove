/**
 * Stage the kosher food finder review pack into Needs review.
 *
 * Loads DATABASE_URL from .env.local, then persists NEEDS_REVIEW rows.
 * Does not publish anything to the public site.
 *
 *   npx tsx scripts/stage-kosher-food-pack.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }
  const { stageBuiltInContentBatch } = await import("../lib/content-imports");
  const { kosherFoodBatchCandidates, kosherFoodDedupeReport } = await import(
    "../data/imports/kosher-food-batch/candidates"
  );
  const { addressKey, namePlaceKeyFor } = await import("../data/imports/kosher-food-batch/dedupe");
  const { normalizeText } = await import("../data/imports/kosher-food-batch/schema");
  const { prisma } = await import("../lib/prisma");

  const existing = await prisma.contentImportCandidate.findMany({
    where: {
      OR: [
        { kind: "KOSHER_FOOD" },
        { name: { contains: "kosher", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      address: true,
      website: true,
      sourceId: true,
      status: true,
    },
  });
  const existingIds = new Set(existing.map((row) => row.sourceId));
  const existingNames = new Set(
    existing.map((row) => namePlaceKeyFor(row.name, row.city, row.country)).filter(Boolean),
  );
  const existingAddresses = new Set(
    existing
      .map((row) => {
        if (!row.address) return "";
        const key = addressKey(row.address, row.city, row.country);
        return key ? `${key}::${normalizeText(row.city)}::${normalizeText(row.country)}` : "";
      })
      .filter(Boolean),
  );

  const dbHits = kosherFoodBatchCandidates.filter((row) => {
    const nameKey = namePlaceKeyFor(row.name, row.locality, row.country);
    const addr = addressKey(row.address, row.locality, row.country);
    const addrKey = addr ? `${addr}::${normalizeText(row.locality)}::${normalizeText(row.country)}` : "";
    return existingIds.has(row.sourceId) || existingNames.has(nameKey) || (addrKey && existingAddresses.has(addrKey));
  });

  const result = await stageBuiltInContentBatch("kosher-food-batch");
  const staged = await prisma.contentImportCandidate.findMany({
    where: { batch: { slug: "kosher-food-batch" } },
    select: { status: true },
  });
  const byStatus: Record<string, number> = {};
  for (const row of staged) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        pack: "kosher-food-batch",
        drafted: kosherFoodDedupeReport.drafted,
        droppedBeforeStage: kosherFoodDedupeReport.dropped,
        dropReasons: kosherFoodDedupeReport.byReason,
        drops: kosherFoodDedupeReport.drops,
        packRowsAfterDedupe: kosherFoodBatchCandidates.length,
        alreadyInReviewQueue: dbHits.length,
        insertAttempted: result.total,
        insertCreated: result.created,
        batchRowsNow: staged.length,
        byStatus,
        published: 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
