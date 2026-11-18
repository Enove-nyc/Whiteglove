/**
 * Copy the large private review packs from the repo into the database.
 *
 * Runs on every build, before `next build` (see netlify.toml and the
 * Cloudflare build command). The site no longer compiles these packs in — see
 * lib/import-packs.ts — so this is how the admin's review screens get them.
 *
 * Only a pack whose contents changed is written, so an ordinary build sends a
 * few hashes and nothing else. A failure fails the build: an admin review
 * queue that silently lost thousands of candidates is worse than a build that
 * says why it stopped.
 */

import { gzipSync } from "node:zlib";
import { IMPORT_PACK_SOURCES, importPacks, packHash } from "../lib/import-packs";
import { prisma } from "../lib/prisma";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set, so the review packs cannot be copied into the database.");
  }
  const packs = importPacks();
  const existing = new Map((await prisma.importPack.findMany({ select: { key: true, hash: true } })).map((row) => [row.key, row.hash]));
  for (const { key } of IMPORT_PACK_SOURCES) {
    const json = JSON.stringify(packs[key]);
    const hash = packHash(json);
    if (existing.get(key) === hash) {
      console.log(`review pack ${key}: unchanged`);
      continue;
    }
    const data = gzipSync(json, { level: 9 }).toString("base64");
    await prisma.importPack.upsert({ where: { key }, create: { key, hash, data }, update: { hash, data } });
    console.log(`review pack ${key}: written (${(data.length / 1e6).toFixed(2)} MB stored)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
