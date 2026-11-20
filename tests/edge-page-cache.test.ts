import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { edgeCacheKey, edgeCacheable } from "@/lib/edge-page-cache";

/**
 * The five-minute edge copy of the pages every signed-out visitor sees alike
 * (the 10 ms free-plan limit, AGENTS.md). Each case here is a way a personal
 * page, or a page behind the password gate, could reach the wrong person.
 */
const req = (url: string, headers: Record<string, string> = {}, method = "GET") => ({
  method, url, headers: { get: (n: string) => ({ accept: "text/html,*/*", "user-agent": "Mozilla/5.0", ...headers } as Record<string, string>)[n.toLowerCase()] ?? null },
});

describe("what is served from the copy", () => {
  it("the public pages, keyed by deploy and by phone or desktop", () => {
    const key = edgeCacheKey(req("https://www.whitegloveitineraries.com/"), "v1");
    assert.equal(key, "https://www.whitegloveitineraries.com/?__edge=v1&__d=d");
    assert.match(edgeCacheKey(req("https://www.whitegloveitineraries.com/itinerary", { "user-agent": "iPhone Mobile" }), "v1")!, /__d=m$/);
    assert.notEqual(edgeCacheKey(req("https://www.whitegloveitineraries.com/about"), "v1"), edgeCacheKey(req("https://www.whitegloveitineraries.com/about"), "v2"));
  });
  it("never for anybody carrying one of the site's cookies — signed in, admin, or past the password gate", () => {
    for (const cookie of ["white_glove_account=x", "a=1; white_glove_site_access=y", "white_glove_admin=z", "white_glove_google=q"]) {
      assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/", { cookie }), "v1"), null, cookie);
    }
    assert.ok(edgeCacheKey(req("https://www.whitegloveitineraries.com/", { cookie: "_ga=1" }), "v1"));
  });
  it("never for a query string, another host, another method, Markdown or page data", () => {
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/book?type=cars"), "v1"), null);
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/?preview=abc"), "v1"), null);
    assert.equal(edgeCacheKey(req("https://admin.whitegloveitineraries.com/"), "v1"), null);
    assert.equal(edgeCacheKey(req("https://whiteglove.workers.dev/"), "v1"), null);
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/", {}, "POST"), "v1"), null);
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/", { accept: "text/markdown" }), "v1"), null);
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/", { accept: "text/x-component" }), "v1"), null);
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/app"), "v1"), null);
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/account"), "v1"), null);
  });
  it("is off when the deploy cannot be named", () => {
    assert.equal(edgeCacheKey(req("https://www.whitegloveitineraries.com/"), ""), null);
  });
});

describe("what is kept", () => {
  const res = (status: number, headers: Record<string, string>) => ({ status, headers: { get: (n: string) => headers[n.toLowerCase()] ?? null } });
  it("only a plain 200 HTML page with no cookie being set", () => {
    assert.equal(edgeCacheable(res(200, { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" })), true);
    assert.equal(edgeCacheable(res(307, { "content-type": "text/html" })), false);
    assert.equal(edgeCacheable(res(200, { "content-type": "text/html", "set-cookie": "a=b" })), false);
    assert.equal(edgeCacheable(res(200, { "content-type": "application/json" })), false);
  });
  it("the browser never keeps a copy of its own", () => {
    assert.match(readFileSync("cloudflare-worker.ts", "utf8"), /served\.headers\.set\("cache-control", "private, no-cache"\)/);
  });
});
