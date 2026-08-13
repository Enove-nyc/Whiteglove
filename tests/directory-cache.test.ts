import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * /directory went from force-dynamic (a real database read on every visit,
 * including every crawler) to a tagged unstable_cache, busted the moment a
 * write actually happens. That trade is only safe if EVERY way a provider
 * can change actually busts the tag — miss one and that path goes stale
 * silently, invisible until someone notices a save "didn't work".
 *
 * Source checks, not behaviour tests: unstable_cache and updateTag need a
 * real Next.js request context to run, which this test environment does not
 * have (the same reason lib/directory.ts imports next/cache dynamically
 * rather than at module scope — see the comment on getPublicProviders).
 */

const DIRECTORY = readFileSync("lib/directory.ts", "utf8");
const CONTENT_ADMIN = readFileSync("lib/content-admin.ts", "utf8");
const DB_SETUP = readFileSync("lib/db-setup.ts", "utf8");
const QUICK_ADD_ROUTE = readFileSync("app/api/admin/directory/route.ts", "utf8");
const PAGE = readFileSync("app/directory/page.tsx", "utf8");

function body(source: string, fnName: string): string {
  const start = source.indexOf(`function ${fnName}(`);
  assert.ok(start >= 0, `expected to find function ${fnName}`);
  const from = source.indexOf("{", start);
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  throw new Error(`unterminated function body for ${fnName}`);
}

describe("every way a directory provider can change busts the public cache", () => {
  it("the tag is exported so every write path can import the same one", () => {
    assert.match(DIRECTORY, /export const DIRECTORY_PUBLIC_TAG/);
  });

  it("getPublicProviders is cached, tagged with DIRECTORY_PUBLIC_TAG, and does not import next/cache at module scope", () => {
    const fn = body(DIRECTORY, "getPublicProviders");
    assert.match(fn, /unstable_cache/, "the public read must go through unstable_cache");
    assert.match(fn, /tags:\s*\[DIRECTORY_PUBLIC_TAG\]/, "the cache entry must carry the tag every write path busts");
    assert.doesNotMatch(
      DIRECTORY.slice(0, DIRECTORY.indexOf("export async function getPublicProviders")),
      /^import\s*\{[^}]*unstable_cache/m,
      "next/cache must be imported dynamically inside the function, not at module scope — a top-level import breaks every plain-Node test that imports this file",
    );
  });

  it("readProviders (the admin's own read) is never wrapped in the cache", () => {
    // The admin screen has to see a save immediately, before any tag
    // invalidation lands — it calls readProviders directly for exactly that
    // reason. If this ever gets cached too, the admin would show stale data
    // right after saving it, which is worse than the CPU this change saves.
    const fn = body(DIRECTORY, "readProviders");
    assert.doesNotMatch(fn, /unstable_cache/);
  });

  for (const [label, source, fnName] of [
    ["the Prisma-backed admin editor: createProvider", CONTENT_ADMIN, "createProvider"],
    ["the Prisma-backed admin editor: updateProvider", CONTENT_ADMIN, "updateProvider"],
    ["the Prisma-backed admin editor: deleteProvider", CONTENT_ADMIN, "deleteProvider"],
  ] as const) {
    it(`${label} busts DIRECTORY_PUBLIC_TAG`, () => {
      assert.match(body(source, fnName), /updateTag\(DIRECTORY_PUBLIC_TAG\)/);
    });
  }

  it("the bulk re-import (lib/db-setup.ts) busts DIRECTORY_PUBLIC_TAG — it writes directly through Prisma, bypassing createProvider", () => {
    assert.match(body(DB_SETUP, "seedDatabase"), /updateTag\(DIRECTORY_PUBLIC_TAG\)/);
  });

  it("the Redis-backed quick-add route busts DIRECTORY_PUBLIC_TAG on both save and delete", () => {
    const postStart = QUICK_ADD_ROUTE.indexOf("export async function POST");
    const deleteStart = QUICK_ADD_ROUTE.indexOf("export async function DELETE");
    assert.match(QUICK_ADD_ROUTE.slice(postStart, deleteStart), /updateTag\(DIRECTORY_PUBLIC_TAG\)/, "POST must bust the tag");
    assert.match(QUICK_ADD_ROUTE.slice(deleteStart), /updateTag\(DIRECTORY_PUBLIC_TAG\)/, "DELETE must bust the tag");
  });

  it("/directory is no longer force-dynamic", () => {
    assert.doesNotMatch(PAGE, /export const dynamic = "force-dynamic"/);
  });
});
