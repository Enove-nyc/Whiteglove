import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * On a Cloudflare Worker the database is reached over Neon's HTTP driver, and
 * the site never opens an interactive transaction — the HTTP driver cannot run
 * one (19 November 2026).
 */
describe("the database client on Cloudflare", () => {
  const src = readFileSync("lib/prisma.ts", "utf8");
  it("uses Neon's HTTP driver on a Worker and the pool elsewhere", () => {
    assert.match(src, /onWorker \? new PrismaNeonHttp\(connectionString, \{\}\) : new PrismaNeon\(\{ connectionString \}\)/);
  });
  it("keeps one shared client", () => {
    assert.match(src, /export const prisma = globalForPrisma\.prisma \?\? createClient\(\);/);
  });
});
