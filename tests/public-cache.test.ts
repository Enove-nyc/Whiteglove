import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PUBLIC_CONTENT_TAGS } from "@/lib/public-cache";

/**
 * The public lists are cached now, and that is only safe while every write
 * busts them.
 *
 * WHY THIS FILE EXISTS. Half a dozen pages were `force-dynamic` and re-read
 * whole tables on every visit — 176 batei hachaim, 341 kevarim, 150
 * attractions, for every visitor and every crawler. That emptied the
 * database's monthly transfer quota and the setup button came back with "Your
 * project has exceeded the data transfer quota".
 *
 * Caching them fixes that, and introduces a worse failure mode if it is done
 * carelessly: a save the owner can see in the admin and a visitor cannot see
 * for an hour. He would report it as "my edit did not save", and nothing would
 * look broken. So the two halves are asserted together — the pages read the
 * cached function, AND the write paths bust the tag.
 */

const read = (path: string) => readFileSync(path, "utf8");

describe("the pages that were expensive", () => {
  /** Page, and the cached reader it must be using. */
  const PAGES: Array<[string, string]> = [
    ["app/heritage/page.tsx", "getPublicCemeteryList"],
    ["app/cemeteries/page.tsx", "getPublicCemeteryList"],
    ["app/stops/page.tsx", "getPublicCemeteryList"],
    ["app/map/page.tsx", "getPublicAttractionList"],
    ["app/things-to-do/page.tsx", "getPublicAttractionList"],
    ["app/hotels/page.tsx", "getPublicStayList"],
    ["app/mikvaos/page.tsx", "listPublicMikvaos"],
    ["app/hechsherim/page.tsx", "listPublicAgencies"],
  ];

  for (const [page, reader] of PAGES) {
    it(`${page} reads through ${reader}`, () => {
      assert.match(read(page), new RegExp(reader));
    });
  }

  it("none of them is force-dynamic any more, except the one that answers a search", () => {
    // force-dynamic on these is the whole cost. A page put back on the list
    // without a reason undoes the fix silently.
    //
    // /hotels is the exception and stays per-request: it answers a search, and
    // a search result cannot be a cached file. It still gets the saving that
    // matters, because the database read behind the render is cached.
    for (const [page] of PAGES) {
      if (page === "app/hotels/page.tsx") continue;
      assert.doesNotMatch(read(page), /export const dynamic = "force-dynamic"/, page);
    }
  });
});

describe("the writes that have to bust it", () => {
  it("every content mutation in the admin says content changed", () => {
    const source = read("lib/content-admin.ts");
    assert.match(source, /async function contentChanged\(\)/);
    assert.match(source, /bustPublicContent/);
    // It must not call ITSELF. A sweep that replaced every
    // invalidateSiteSearchIndex() with contentChanged() rewrote the one inside
    // this helper too, which type-checks, lints and builds — and hangs every
    // admin save the first time somebody presses it.
    const helper = source.slice(source.indexOf("async function contentChanged()"));
    assert.doesNotMatch(helper.slice(0, 200), /contentChanged\(\);/);
    assert.match(helper.slice(0, 200), /invalidateSiteSearchIndex\(\);/);
    // Each of these is a write a visitor is supposed to see.
    const MUST_BUST = [
      "createPlace",
      "updatePlace",
      "deletePlace",
      "createLink",
      "updateLink",
      "deleteLink",
      "createCemetery",
      "saveCemeteryContact",
      "deleteCemeteryContact",
      "saveCemeteryBurial",
      "deleteCemeteryBurial",
      "createAttraction",
      "createKosherStay",
    ];
    for (const fn of MUST_BUST) {
      const start = source.indexOf(`export async function ${fn}`);
      assert.ok(start > -1, `${fn} is gone — update this list`);
      // The function body, to its closing brace at column 0.
      const body = source.slice(start, source.indexOf("\n}\n", start));
      assert.match(body, /contentChanged\(\)/, `${fn} does not bust the public cache`);
    }
  });

  it("the setup button busts it, because an import rewrites every list", () => {
    assert.match(read("lib/db-setup.ts"), /bustPublicContent/);
  });
});

describe("the tags", () => {
  it("are distinct, so nothing is listed twice", () => {
    assert.equal(new Set(PUBLIC_CONTENT_TAGS).size, PUBLIC_CONTENT_TAGS.length);
  });

  it("do not collide with the directory's own tag", () => {
    // lib/directory.ts got here first and owns DIRECTORY_PUBLIC_TAG.
    assert.ok(!PUBLIC_CONTENT_TAGS.includes("directory-public" as never));
  });
});
