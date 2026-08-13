import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Four pages went from force-dynamic (a real database or Redis read on
 * every visit, including every crawler) to a tagged cachedRead, busted the
 * moment a write actually happens instead of on a timer — see
 * lib/cache-tags.ts for why a timer alone (`export const revalidate = N`)
 * was tried and measured broken here before this existed.
 *
 * That trade is only safe if EVERY way the underlying data can change busts
 * its tag — miss one and that path goes stale silently, invisible until
 * someone notices a save "didn't work". Each entry below is one page's full
 * write-path inventory, found by tracing every Prisma/Redis write that can
 * reach that page's data — not assumed complete, checked.
 *
 * Source checks, not behaviour tests: unstable_cache and updateTag need a
 * real Next.js request context this test environment does not have, which
 * is exactly why lib/cache-tags.ts exists — cachedRead/bustTag fail safe to
 * "run uncached" outside that context instead of crashing plain-Node tests.
 */

const CONTENT_ADMIN = readFileSync("lib/content-admin.ts", "utf8");
const CONTENT_IMPORTS = readFileSync("lib/content-imports.ts", "utf8");
const DB_SETUP = readFileSync("lib/db-setup.ts", "utf8");

function body(source: string, fnName: string): string {
  // `function fnName(` for an ordinary function, `function fnName<` for one
  // with a generic type parameter (cachedRead<T> in lib/cache-tags.ts).
  const start = source.search(new RegExp(`function ${fnName}[(<]`));
  assert.ok(start >= 0, `expected to find function ${fnName}`);
  const parenStart = source.indexOf("(", start);
  let parenDepth = 0;
  let parenEnd = -1;
  for (let i = parenStart; i < source.length; i++) {
    if (source[i] === "(") parenDepth++;
    if (source[i] === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        parenEnd = i;
        break;
      }
    }
  }
  assert.ok(parenEnd >= 0, `unterminated parameter list for ${fnName}`);
  // Skip the return-type annotation too — a return type like
  // Promise<{ ok: boolean }> has a brace of its own, before the one that
  // actually opens the function body.
  let angleDepth = 0;
  let from = -1;
  for (let i = parenEnd + 1; i < source.length; i++) {
    if (source[i] === "<") angleDepth++;
    else if (source[i] === ">") angleDepth--;
    else if (source[i] === "{" && angleDepth === 0) {
      from = i;
      break;
    }
  }
  assert.ok(from >= 0, `could not find the body of ${fnName}`);
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

function noModuleScopeNextCache(source: string, beforeMarker: string) {
  const cut = source.indexOf(beforeMarker);
  assert.ok(cut >= 0, `expected to find ${beforeMarker}`);
  assert.doesNotMatch(
    source.slice(0, cut),
    /from ["']next\/cache["']/,
    "a top-level next/cache import breaks module loading for every plain-Node test that imports this file, whether or not the test calls the function that needed it",
  );
}

describe("lib/cache-tags.ts helpers themselves", () => {
  const CACHE_TAGS = readFileSync("lib/cache-tags.ts", "utf8");
  it("cachedRead falls back to running uncached when next/cache is unavailable", () => {
    const fn = body(CACHE_TAGS, "cachedRead");
    assert.match(fn, /catch/);
    assert.match(fn, /return fn\(\)/);
  });
  it("bustTag fails silently when next/cache is unavailable", () => {
    const fn = body(CACHE_TAGS, "bustTag");
    assert.match(fn, /catch/);
  });
});

describe("/directory — DIRECTORY_PUBLIC_TAG", () => {
  const DIRECTORY = readFileSync("lib/directory.ts", "utf8");
  const QUICK_ADD_ROUTE = readFileSync("app/api/admin/directory/route.ts", "utf8");
  const PAGE = readFileSync("app/directory/page.tsx", "utf8");

  it("the tag is exported so every write path can import the same one", () => {
    assert.match(DIRECTORY, /export const DIRECTORY_PUBLIC_TAG/);
  });

  it("getPublicProviders goes through cachedRead, tagged, with no module-scope next/cache import", () => {
    const fn = body(DIRECTORY, "getPublicProviders");
    assert.match(fn, /cachedRead/);
    assert.match(fn, /DIRECTORY_PUBLIC_TAG/);
    noModuleScopeNextCache(DIRECTORY, "export async function getPublicProviders");
  });

  it("readProviders (the admin's own read) is never wrapped in the cache — it has to see a save immediately", () => {
    assert.doesNotMatch(body(DIRECTORY, "readProviders"), /cachedRead/);
  });

  for (const fnName of ["createProvider", "updateProvider", "deleteProvider"]) {
    it(`content-admin.ts's ${fnName} busts DIRECTORY_PUBLIC_TAG`, () => {
      assert.match(body(CONTENT_ADMIN, fnName), /bustTag\(DIRECTORY_PUBLIC_TAG\)/);
    });
  }

  it("the bulk re-import (writes directly through Prisma, bypassing createProvider) busts DIRECTORY_PUBLIC_TAG", () => {
    assert.match(body(DB_SETUP, "seedDatabase"), /bustTag\(DIRECTORY_PUBLIC_TAG\)/);
  });

  it("the Redis-backed quick-add route busts DIRECTORY_PUBLIC_TAG on both save and delete", () => {
    const postStart = QUICK_ADD_ROUTE.indexOf("export async function POST");
    const deleteStart = QUICK_ADD_ROUTE.indexOf("export async function DELETE");
    assert.match(QUICK_ADD_ROUTE.slice(postStart, deleteStart), /bustTag\(DIRECTORY_PUBLIC_TAG\)/, "POST must bust the tag");
    assert.match(QUICK_ADD_ROUTE.slice(deleteStart), /bustTag\(DIRECTORY_PUBLIC_TAG\)/, "DELETE must bust the tag");
  });

  it("/directory is no longer force-dynamic", () => {
    assert.doesNotMatch(PAGE, /export const dynamic = "force-dynamic"/);
  });
});

describe("/map and /things-to-do — ATTRACTIONS_PUBLIC_TAG", () => {
  const ATTRACTIONS_VIEW = readFileSync("lib/attractions-view.ts", "utf8");
  const MAP_PAGE = readFileSync("app/map/page.tsx", "utf8");
  const TTD_PAGE = readFileSync("app/things-to-do/page.tsx", "utf8");

  it("the tag is exported", () => {
    assert.match(ATTRACTIONS_VIEW, /export const ATTRACTIONS_PUBLIC_TAG/);
  });

  for (const fnName of ["getAttractionList", "getStayList", "getAreaList"]) {
    it(`${fnName} goes through cachedRead, tagged, keyed on its cities argument`, () => {
      const fn = body(ATTRACTIONS_VIEW, fnName);
      assert.match(fn, /cachedRead/);
      assert.match(fn, /ATTRACTIONS_PUBLIC_TAG/);
      assert.match(fn, /cities/, "the cache key must fold in the cities filter, or a filtered and unfiltered call would collide");
    });
  }

  it("no module-scope next/cache import", () => {
    noModuleScopeNextCache(ATTRACTIONS_VIEW, "export async function getAttractionList");
  });

  it("createAttraction busts ATTRACTIONS_PUBLIC_TAG — covers both the admin's add form and the import-review publish step, its two callers", () => {
    assert.match(body(CONTENT_ADMIN, "createAttraction"), /bustTag\(ATTRACTIONS_PUBLIC_TAG\)/);
  });

  it("createKosherStay busts ATTRACTIONS_PUBLIC_TAG — same two callers", () => {
    assert.match(body(CONTENT_ADMIN, "createKosherStay"), /bustTag\(ATTRACTIONS_PUBLIC_TAG\)/);
  });

  it("the bulk re-import busts ATTRACTIONS_PUBLIC_TAG — the only writer of KosherArea at all", () => {
    assert.match(body(DB_SETUP, "seedDatabase"), /bustTag\(ATTRACTIONS_PUBLIC_TAG\)/);
  });

  it("/map is no longer force-dynamic", () => {
    assert.doesNotMatch(MAP_PAGE, /export const dynamic = "force-dynamic"/);
  });

  it("/things-to-do is no longer force-dynamic", () => {
    assert.doesNotMatch(TTD_PAGE, /export const dynamic = "force-dynamic"/);
  });

  it("/hotels stays force-dynamic — it reads searchParams, which Next.js forces dynamic regardless of any cache config", () => {
    const hotels = readFileSync("app/hotels/page.tsx", "utf8");
    assert.match(hotels, /searchParams/);
  });
});

describe("/hechsherim — HECHSHER_AGENCIES_TAG", () => {
  const HECHSHER_STORE = readFileSync("lib/hechsher-store.ts", "utf8");
  const PAGE = readFileSync("app/hechsherim/page.tsx", "utf8");

  it("the tag is exported", () => {
    assert.match(HECHSHER_STORE, /export const HECHSHER_AGENCIES_TAG/);
  });

  it("listAgencies goes through cachedRead, tagged, with no module-scope next/cache import", () => {
    const fn = body(HECHSHER_STORE, "listAgencies");
    assert.match(fn, /cachedRead/);
    assert.match(fn, /HECHSHER_AGENCIES_TAG/);
    noModuleScopeNextCache(HECHSHER_STORE, "export async function listAgencies");
  });

  it("saveAgency busts HECHSHER_AGENCIES_TAG", () => {
    assert.match(body(HECHSHER_STORE, "saveAgency"), /bustTag\(HECHSHER_AGENCIES_TAG\)/);
  });

  it("deleteAgency busts HECHSHER_AGENCIES_TAG", () => {
    assert.match(body(HECHSHER_STORE, "deleteAgency"), /bustTag\(HECHSHER_AGENCIES_TAG\)/);
  });

  it("/hechsherim is no longer force-dynamic", () => {
    assert.doesNotMatch(PAGE, /export const dynamic = "force-dynamic"/);
  });
});

describe("/mikvaos — PRACTICAL_PLACES_PUBLIC_TAG", () => {
  const MIKVAOS = readFileSync("lib/mikvaos.ts", "utf8");
  const PAGE = readFileSync("app/mikvaos/page.tsx", "utf8");

  it("the tag is exported", () => {
    assert.match(MIKVAOS, /export const PRACTICAL_PLACES_PUBLIC_TAG/);
  });

  it("listPublishedMikvaos goes through cachedRead, tagged, with no module-scope next/cache import", () => {
    const fn = body(MIKVAOS, "listPublishedMikvaos");
    assert.match(fn, /cachedRead/);
    assert.match(fn, /PRACTICAL_PLACES_PUBLIC_TAG/);
    noModuleScopeNextCache(MIKVAOS, "export async function listPublishedMikvaos");
  });

  for (const fnName of ["createPlace", "updatePlace", "deletePlace"]) {
    it(`content-admin.ts's ${fnName} busts PRACTICAL_PLACES_PUBLIC_TAG — the shared editor behind every PracticalPlace category, mikvaos included`, () => {
      assert.match(body(CONTENT_ADMIN, fnName), /bustTag\(PRACTICAL_PLACES_PUBLIC_TAG\)/);
    });
  }

  it("the import-review publish step busts PRACTICAL_PLACES_PUBLIC_TAG — it writes PracticalPlace directly, bypassing createPlace", () => {
    assert.match(CONTENT_IMPORTS, /bustTag\(PRACTICAL_PLACES_PUBLIC_TAG\)/);
  });

  it("the bulk re-import busts PRACTICAL_PLACES_PUBLIC_TAG", () => {
    assert.match(body(DB_SETUP, "seedDatabase"), /bustTag\(PRACTICAL_PLACES_PUBLIC_TAG\)/);
  });

  it("/mikvaos is no longer force-dynamic", () => {
    assert.doesNotMatch(PAGE, /export const dynamic = "force-dynamic"/);
  });
});

describe("/search stays force-dynamic on purpose, but the index it searches is now cached", () => {
  it("it reads searchParams (the typed query), which Next.js forces dynamic regardless of any cache config — no page-level fix is possible here", () => {
    const search = readFileSync("app/search/page.tsx", "utf8");
    assert.match(search, /searchParams/);
  });

  const SITE_SEARCH_INDEX = readFileSync("lib/site-search-index.ts", "utf8");

  it("getSearchIndex goes through cachedRead, tagged with SEARCH_INDEX_TAG", () => {
    const fn = body(SITE_SEARCH_INDEX, "getSearchIndex");
    assert.match(fn, /cachedRead/);
    assert.match(fn, /SEARCH_INDEX_TAG/);
  });

  it("buildSearchIndex — the pure builder tests call directly — never wraps itself in the cache", () => {
    // If this ever changed, buildSearchIndex would stop being the "always
    // fresh" function its own tests rely on.
    assert.doesNotMatch(body(SITE_SEARCH_INDEX, "buildSearchIndex"), /cachedRead/);
  });

  it("invalidateSiteSearchIndex busts SEARCH_INDEX_TAG — every one of its six existing call sites relies on this", () => {
    assert.match(body(SITE_SEARCH_INDEX, "invalidateSiteSearchIndex"), /bustTag\(SEARCH_INDEX_TAG\)/);
  });
});

describe("/heritage, /cemeteries and /stops — CEMETERIES_PUBLIC_TAG", () => {
  /**
   * The fourth list, added after the three above.
   *
   * getCemeteryList is the heaviest read on the site — 176 batei hachaim plus
   * a burial-count query across every one of them — and it feeds three public
   * pages. /heritage was still force-dynamic, a full re-read on every visit
   * including every crawler, after the others had been fixed.
   */
  const CEMETERIES_VIEW = readFileSync("lib/cemeteries-view.ts", "utf8");

  it("the tag is exported so every write path can import the same one", () => {
    assert.match(CEMETERIES_VIEW, /export const CEMETERIES_PUBLIC_TAG = "cemeteries-public"/);
  });

  it("getPublicCemeteryList goes through cachedRead, tagged", () => {
    const fn = body(CEMETERIES_VIEW, "getPublicCemeteryList");
    assert.match(fn, /cachedRead/);
    assert.match(fn, /CEMETERIES_PUBLIC_TAG/);
  });

  it("getCemeteryList — what the admin reads — is never wrapped, so a save shows at once", () => {
    assert.doesNotMatch(body(CEMETERIES_VIEW, "getCemeteryList"), /cachedRead/);
  });

  it("no module-scope next/cache import", () => {
    assert.doesNotMatch(CEMETERIES_VIEW, /^import .*from "next\/cache"/m);
  });

  for (const fnName of [
    "createCemetery",
    "createCemeteryWithBurial",
    "saveCemeteryBurial",
    "deleteCemeteryBurial",
    "saveCemeteryContact",
    "deleteCemeteryContact",
  ]) {
    it(`content-admin.ts's ${fnName} busts CEMETERIES_PUBLIC_TAG`, () => {
      assert.match(body(CONTENT_ADMIN, fnName), /contentChanged\(\)/);
    });
  }

  it("contentChanged is what busts it, and does not call itself", () => {
    // A sweep that replaced every invalidateSiteSearchIndex() with
    // contentChanged() once rewrote the call inside this helper too. That
    // type-checks, lints and builds — and hangs every admin save.
    const fn = body(CONTENT_ADMIN, "contentChanged");
    assert.match(fn, /bustTag\(CEMETERIES_PUBLIC_TAG\)/);
    assert.doesNotMatch(fn, /await contentChanged\(\)/);
  });

  it("the bulk re-import busts CEMETERIES_PUBLIC_TAG — it rewrites the cemeteries too", () => {
    assert.match(body(DB_SETUP, "seedDatabase"), /bustTag\(CEMETERIES_PUBLIC_TAG\)/);
  });

  it("all three pages read the cached list, and none is force-dynamic", () => {
    for (const page of ["app/heritage/page.tsx", "app/cemeteries/page.tsx", "app/stops/page.tsx"]) {
      const source = readFileSync(page, "utf8");
      assert.match(source, /getPublicCemeteryList/, page);
      assert.doesNotMatch(source, /export const dynamic = "force-dynamic"/, page);
    }
  });
});
