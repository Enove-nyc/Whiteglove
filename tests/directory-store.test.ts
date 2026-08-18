import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The one key that holds every listing the owner typed in.
 *
 * THIS FILE EXISTS BECAUSE HE LOST THEM. Every listing lives in a single Redis
 * key as one list, so saving one means reading the whole list, adding to it,
 * and writing the whole thing back. The read returned `[]` on any failure —
 * a blip, a rate limit, a non-2xx — which is indistinguishable from "there are
 * no listings". The save then wrote a list of exactly one and erased the rest;
 * a delete wrote an empty list and erased all of them.
 *
 * Read-modify-write over a whole collection is only safe if a failed read
 * stops the write. These tests hold that line, because the failure is silent:
 * nothing errors, nothing logs, the entries are simply not there any more.
 */

const STORE = readFileSync("lib/directory-store.ts", "utf8");

describe("a failed read never becomes a write", () => {
  it("TELLS THE CALLER WHETHER THE READ WORKED", () => {
    // Not a bare array. An empty array cannot say which of the two it is.
    assert.match(STORE, /type Reading = \{ ok: boolean; items: StoredProvider\[\] \}/);
    assert.match(STORE, /async function redisRead\(\): Promise<Reading>/);
  });

  it("SAVING REFUSES WHEN THE LIST COULD NOT BE READ", () => {
    const save = STORE.slice(STORE.indexOf("export async function saveStoredProvider"), STORE.indexOf("export async function deleteStoredProvider"));
    assert.match(save, /const reading = await redisRead\(\)/);
    assert.match(save, /if \(!reading\.ok\) return null/);
    // And the guard comes before anything is written.
    assert.ok(save.indexOf("reading.ok") < save.indexOf("redisSet"), "it writes before checking the read");
  });

  it("DELETING REFUSES TOO, WHERE IT MATTERED MOST", () => {
    // A failed read here used to write an empty list: deleting one listing
    // deleted every listing.
    const del = STORE.slice(STORE.indexOf("export async function deleteStoredProvider"));
    assert.match(del, /if \(!reading\.ok\) return false/);
    assert.ok(del.indexOf("reading.ok") < del.indexOf("redisSet"), "it writes before checking the read");
  });

  it("neither write path reads through the lenient helper", () => {
    // listStoredProviders swallows failures on purpose, for pages. A write
    // using it is the original bug returning.
    const writes = STORE.slice(STORE.indexOf("export async function saveStoredProvider"));
    assert.ok(!writes.includes("await listStoredProviders()"), "a write path is using the lenient read again");
  });

  it("AN ABSENT KEY IS STILL A SUCCESSFUL READ", () => {
    // Otherwise the very first listing could never be saved — the guard would
    // refuse forever on an empty store.
    assert.match(STORE, /if \(!raw\) return \{ ok: true, items: \[\] \}/);
  });

  it("keeps showing pages an empty list rather than an error", () => {
    const list = STORE.slice(STORE.indexOf("export async function listStoredProviders"), STORE.indexOf("const CATEGORIES"));
    assert.match(list, /\(await redisRead\(\)\)\.items/);
  });
});
