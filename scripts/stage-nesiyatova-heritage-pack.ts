/**
 * Stage the Nesiya Tova heritage pack into Needs review.
 * Does not publish anything to the public site.
 *
 *   npx tsx scripts/stage-nesiyatova-heritage-pack.ts
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
  const { nesiyatovaHeritageCandidates, nesiyatovaHeritageDedupeReport } = await import(
    "../data/imports/nesiyatova-heritage-batch/candidates"
  );
  const { prisma } = await import("../lib/prisma");

  const result = await stageBuiltInContentBatch("nesiyatova-heritage-batch");
  const staged = await prisma.contentImportCandidate.findMany({
    where: { batch: { slug: "nesiyatova-heritage-batch" } },
    select: { status: true },
  });
  const byStatus: Record<string, number> = {};
  for (const row of staged) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        pack: "nesiyatova-heritage-batch",
        packRowsAfterDedupe: nesiyatovaHeritageCandidates.length,
        droppedBeforeStage: nesiyatovaHeritageDedupeReport.dropped,
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
