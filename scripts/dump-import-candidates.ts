/**
 * Dump all built-in import candidates via the real TypeScript modules.
 * Output: scripts/_all-import-candidates.json
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { worldwideBatch2Candidates } from "../data/imports/worldwide-batch-2/candidates";
import { worldwideBatch3Candidates } from "../data/imports/worldwide-batch-3/candidates";
import { worldwideBatch4Candidates } from "../data/imports/worldwide-batch-4/candidates";
import { worldwideBatch5Candidates } from "../data/imports/worldwide-batch-5/candidates";
import { kosherFoodBatchCandidates } from "../data/imports/kosher-food-batch/candidates";

function slim(pack: string, row: Record<string, unknown>) {
  return {
    pack,
    id: row.id ?? null,
    market: row.market ?? "",
    entityType: row.entityType ?? "",
    importKind: row.importKind ?? row.kind ?? "",
    kind: row.kind ?? null,
    importTarget: row.importTarget ?? null,
    category: row.category ?? "",
    listingLabel: row.listingLabel ?? null,
    slug: row.slug ?? "",
    name: row.name ?? "",
    aliases: row.aliases ?? [],
    keywords: row.keywords ?? [],
    locality: row.locality ?? row.city ?? "",
    city: row.city ?? row.locality ?? "",
    destination: row.destination ?? "",
    country: row.country ?? "",
    address: row.address ?? null,
    summary: row.summary ?? null,
    coordinates: row.coordinates ?? null,
    website: row.website ?? null,
    destinationSlug: row.destinationSlug ?? null,
    sourceKey: row.sourceKey ?? null,
    sourceId: row.sourceId ?? null,
  };
}

const packs: Array<{ slug: string; rows: readonly Record<string, unknown>[] }> = [
  { slug: "worldwide-batch-2", rows: worldwideBatch2Candidates as unknown as Record<string, unknown>[] },
  { slug: "worldwide-batch-3", rows: worldwideBatch3Candidates as unknown as Record<string, unknown>[] },
  { slug: "worldwide-batch-4", rows: worldwideBatch4Candidates as unknown as Record<string, unknown>[] },
  { slug: "worldwide-batch-5", rows: worldwideBatch5Candidates as unknown as Record<string, unknown>[] },
  { slug: "kosher-food-batch", rows: kosherFoodBatchCandidates as unknown as Record<string, unknown>[] },
];

const all = [];
const counts: Record<string, number> = {};
for (const pack of packs) {
  counts[pack.slug] = pack.rows.length;
  for (const row of pack.rows) all.push(slim(pack.slug, row));
}

const out = join(process.cwd(), "scripts", "_all-import-candidates.json");
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), counts, total: all.length, rows: all }));
console.log(JSON.stringify({ total: all.length, counts }, null, 2));
console.log(`Wrote ${out}`);
