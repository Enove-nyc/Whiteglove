import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

/**
 * The media store moved from Redis-only to disk-first (a Railway volume),
 * because pictures in Redis are what filled the Upstash limit. The rules
 * that must hold, wherever it runs:
 *
 * - with a disk, uploads land on it and reads come from it;
 * - without one, everything behaves exactly as before (Redis);
 * - an id is a URL parameter and must never become a path — reads check the
 *   minted shape before touching the filesystem;
 * - a file found only in Redis is moved to disk and then deleted from
 *   Redis, in that order, so it always exists somewhere.
 */

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wg-media-"));
  process.env.MEDIA_DIR = join(dir, "media");
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  delete process.env.MEDIA_DIR;
  rmSync(dir, { recursive: true, force: true });
});

async function store() {
  // Re-imported per test via dynamic import; the module reads env at call
  // time, not load time, so one import serves every configuration.
  return import("../lib/media");
}

describe("the disk store", () => {
  it("stores and serves a file with no Redis at all", async () => {
    const media = await store();
    assert.equal(media.diskMediaActive(), true);
    assert.equal(media.mediaStoreAvailable(), true);
    const id = await media.putMedia("image/png", "aGVsbG8=");
    assert.ok(id, "putMedia returned no id");
    const back = await media.getMedia(id!);
    assert.equal(back?.contentType, "image/png");
    assert.equal(back?.data, "aGVsbG8=");
  });

  it("REFUSES AN ID THAT IS NOT AN ID — a path can never be fetched", async () => {
    const media = await store();
    for (const evil of ["../secrets", "m-1/../../etc/passwd", "m-", "%2e%2e", "m-a-b/../c"]) {
      assert.equal(await media.getMedia(evil), null, evil);
    }
  });

  it("raises the size cap only when the disk is there", async () => {
    const media = await store();
    assert.equal(media.effectiveMediaLimit(), media.MAX_DISK_MEDIA_BYTES);
    process.env.MEDIA_DIR = join(dir, "does-not-exist-parent", "media");
    assert.equal(media.effectiveMediaLimit(), media.MAX_MEDIA_BYTES);
  });

  it("writes whole files only — the write is tmp-then-rename", () => {
    const source = readFileSync("lib/media.ts", "utf8");
    assert.match(source, /\.tmp/);
    assert.match(source, /rename\(/);
  });

  it("deletes from Redis only after the disk write succeeded", () => {
    const source = readFileSync("lib/media.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.match(source, /if \(await diskWrite\(id, parsed\)\) \{\s*await redisCommand\(`del\//);
  });

  it("without disk or Redis, the store says so instead of pretending", async () => {
    process.env.MEDIA_DIR = join(dir, "no-such-parent", "media");
    const media = await store();
    assert.equal(media.diskMediaActive(), false);
    assert.equal(media.mediaStoreAvailable(), false);
    assert.equal(await media.putMedia("image/png", "aGVsbG8="), null);
  });

  it("cleans up after the test hook too", async () => {
    const media = await store();
    const id = await media.putMedia("image/png", "aGVsbG8=");
    assert.ok(id);
    await media.deleteMediaFromDisk(id!);
    assert.equal(await media.getMedia(id!), null);
    assert.equal(existsSync(join(process.env.MEDIA_DIR!, `${id}.json`)), false);
  });
});
