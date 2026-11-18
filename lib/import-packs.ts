/**
 * The large private review packs, loaded at run time instead of compiled in.
 *
 * WHY. Four of the source packs under data/imports — worldwide batches 3, 4
 * and 5 and the Nesiya Tova heritage pack, about 38 MB of candidates between
 * them — were imported straight into the admin's review code, so they were
 * built into the site's server bundle and pushed it past the 64 MB a Cloudflare
 * Worker may be. Only the admin's review screens ever read them.
 *
 * So the packs live in the database (the ImportPack table), gzipped, written on
 * every build by scripts/sync-import-packs.ts from the same files in the repo,
 * and read here when an admin review screen asks. Nothing about what the admin
 * shows changes; the packs in the repo stay the source of truth.
 *
 * HOW TO USE IT. Every server entry point that reaches the packs first awaits
 * loadImportPacks(); after that, importPacks() answers synchronously, so the
 * review code keeps its shape. In tests and scripts, run straight from the
 * repo, importPacks() reads the files themselves and no database is needed.
 */

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import type { worldwideBatch3Candidates } from "@/data/imports/worldwide-batch-3/candidates";
import type { worldwideBatch4Candidates } from "@/data/imports/worldwide-batch-4/candidates";
import type { worldwideBatch5Candidates } from "@/data/imports/worldwide-batch-5/candidates";
import type { nesiyatovaHeritageCandidates } from "@/data/imports/nesiyatova-heritage-batch/candidates";

export type ImportPacks = {
  worldwideBatch3Candidates: typeof worldwideBatch3Candidates;
  worldwideBatch4Candidates: typeof worldwideBatch4Candidates;
  worldwideBatch5Candidates: typeof worldwideBatch5Candidates;
  nesiyatovaHeritageCandidates: typeof nesiyatovaHeritageCandidates;
};

/** Each pack: its key in the table, and the repo file and export it comes from. */
export const IMPORT_PACK_SOURCES: ReadonlyArray<{ key: keyof ImportPacks; file: string }> = [
  { key: "worldwideBatch3Candidates", file: "data/imports/worldwide-batch-3/candidates.ts" },
  { key: "worldwideBatch4Candidates", file: "data/imports/worldwide-batch-4/candidates.ts" },
  { key: "worldwideBatch5Candidates", file: "data/imports/worldwide-batch-5/candidates.ts" },
  { key: "nesiyatovaHeritageCandidates", file: "data/imports/nesiyatova-heritage-batch/candidates.ts" },
];

/** The stored form of one pack's JSON and the fingerprint that says whether it changed. */
export function packHash(json: string): string {
  return createHash("sha256").update(json).digest("hex");
}

let cache: ImportPacks | null = null;
let loading: Promise<ImportPacks> | null = null;

/** Read the packs from the files in the repo — tests and scripts only. */
function fromRepoFiles(): ImportPacks {
  // A computed path, so no bundler traces these files into the site. On the
  // host the files are not there and this throws, which is the point: a screen
  // that forgot to await loadImportPacks() fails loudly instead of quietly
  // showing an empty queue.
  const load = createRequire(`${process.cwd()}/package.json`);
  const packs = {} as Record<string, unknown>;
  for (const { key, file } of IMPORT_PACK_SOURCES) {
    const mod = load(`${process.cwd()}/${file}`) as Record<string, unknown>;
    if (!(key in mod)) throw new Error(`${file} does not export ${key}`);
    packs[key] = mod[key];
  }
  return packs as ImportPacks;
}

/** The packs, synchronously. Server code must have awaited loadImportPacks() first. */
export function importPacks(): ImportPacks {
  if (cache) return cache;
  try {
    cache = fromRepoFiles();
    return cache;
  } catch (error) {
    throw new Error(
      `The review packs are not loaded. Await loadImportPacks() before reading them. (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

/** Load the packs from the database once per server instance. */
export async function loadImportPacks(): Promise<ImportPacks> {
  if (cache) return cache;
  if (!process.env.DATABASE_URL) return importPacks();
  loading ??= (async () => {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.importPack.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const packs = {} as Record<string, unknown>;
    for (const { key } of IMPORT_PACK_SOURCES) {
      const row = byKey.get(key);
      if (!row) {
        throw new Error(`Review pack "${key}" is missing from the database. The build writes it: check the sync-import-packs step of the last build.`);
      }
      packs[key] = JSON.parse(gunzipSync(Buffer.from(row.data, "base64")).toString("utf8"));
    }
    cache = packs as ImportPacks;
    return cache;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}
