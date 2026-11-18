import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { inKosherSite, kosherSiteRoute, refererPath } from "@/lib/kosher-site-archive";

/**
 * The whole closed Kosher Travel site, for the owner, inside the admin portal
 * (AGENTS.md, 18 November 2026): admin.whitegloveitineraries.com/site.
 */
describe("the Kosher Travel site inside the admin", () => {
  it("serves /site and everything under it as a page of the old site", () => {
    assert.deepEqual(kosherSiteRoute("/site", null), { kind: "serve", path: "/" });
    assert.deepEqual(kosherSiteRoute("/site/destinations/rome", null), { kind: "serve", path: "/destinations/rome" });
    assert.deepEqual(kosherSiteRoute("/site/admin/shuls", null), { kind: "enter", to: "/admin/shuls" });
    assert.equal(inKosherSite("/sites"), false);
  });

  it("keeps a link followed from a /site page inside /site, even where the name is an admin screen", () => {
    assert.deepEqual(kosherSiteRoute("/destinations/rome", "/site/kosher"), { kind: "enter", to: "/site/destinations/rome" });
    assert.deepEqual(kosherSiteRoute("/", "/site/kosher"), { kind: "enter", to: "/site" });
  });

  it("leaves the admin, its sign-in, the API and files alone", () => {
    for (const p of ["/admin", "/admin/shuls", "/login", "/api/search", "/_next/static/x.js", "/icon.png"]) {
      assert.equal(kosherSiteRoute(p, "/site/kosher"), null, p);
    }
    assert.equal(kosherSiteRoute("/destinations", "/admin"), null);
    assert.equal(kosherSiteRoute("/destinations", null), null);
  });

  it("reads only the path of a referer", () => {
    assert.equal(refererPath("https://admin.whitegloveitineraries.com/site/kosher?x=1"), "/site/kosher");
    assert.equal(refererPath("not a url"), null);
    assert.equal(refererPath(null), null);
  });

  it("is the owner's alone, as Kosher Travel, and never indexed", () => {
    const mw = readFileSync("middleware.ts", "utf8");
    const block = mw.slice(mw.indexOf("const route = kosherSiteRoute("), mw.indexOf('response.headers.set("x-robots-tag", "noindex, nofollow");\n      return response;'));
    assert.match(block, /if \(!\(await isOwner\(request\)\)\)/);
    assert.match(block, /headers\.set\(BRAND_HEADER, "kosher"\)/);
  });

  it("the admin portal has the button", () => {
    const shell = readFileSync("components/AdminShell.tsx", "utf8");
    assert.match(shell, /href=\{KOSHER_SITE_PREFIX\}[\s\S]{0,400}Kosher Travel site/);
  });
});
