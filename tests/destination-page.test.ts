import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { vacationDestinations } from "@/data/vacation-destinations";
import { publicPaths } from "@/lib/site-map";

/**
 * Opening one destination should not read every destination.
 *
 * WHAT THIS IS ABOUT. Going straight to /vacation-ideas/rome — from a search
 * result, a shared link, a bookmark — showed "Loading vacation destinations…"
 * and nothing else for several seconds. The page was `force-dynamic`, so on
 * every view it read every attraction, every stay and every quarter on the
 * site, filtered them down to Rome in memory, and only then rendered a heading
 * that lives in a file that has not changed since the build.
 *
 * Clicking through from the hub hid it, because the browser stays on the
 * previous page while the next one renders. That is why it survived: the only
 * way to see it is a cold request, which is what a first-time visitor makes.
 *
 * The behaviour of the built pages is checked by scripts/audit-destinations.mjs
 * against a running server. These are the structural facts that let it be true,
 * and each one is a thing somebody could undo without noticing.
 */

const PAGE = readFileSync("app/vacation-ideas/[destination]/page.tsx", "utf8");
const SOURCES = readFileSync("lib/vacation-sources.ts", "utf8");

describe("the destination page is prerendered", () => {
  it("IS NOT RENDERED PER REQUEST", () => {
    assert.doesNotMatch(PAGE, /dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("builds every destination at deploy time", () => {
    assert.match(PAGE, /export function generateStaticParams/);
    assert.match(PAGE, /vacationDestinations\.map/);
  });

  it("answers a wrong address with a 404 rather than a page", () => {
    // dynamicParams stays off because the destination list is a file in this
    // repo: a new one arrives with a deploy and never between two of them.
    assert.match(PAGE, /export const dynamicParams = false/);
  });

  it("still picks up an entry the owner adds, without a deploy", () => {
    // The reason the page was dynamic in the first place. A revalidate window
    // and a tag give it; refusing to cache anything ever was the expensive way.
    assert.match(PAGE, /export const revalidate = \d+/);
    assert.match(SOURCES, /VACATION_SOURCES_TAG/);
    const ADD = readFileSync("app/admin/add/actions.ts", "utf8");
    assert.match(ADD, /updateTag\(VACATION_SOURCES_TAG\)/);
    assert.match(ADD, /revalidatePath\("\/vacation-ideas"\)/);
  });
});

describe("the H1 and the summary do not wait on a database", () => {
  it("awaits nothing that needs the destination's listings before rendering", () => {
    // The shell — breadcrumb, H1, summary, the editorial sections — is built
    // from data/vacation-destinations.ts alone. The four sections that need a
    // read are each behind their own boundary.
    const shell = PAGE.slice(PAGE.indexOf("export default async function VacationDestinationPage"));
    const body = shell.slice(0, shell.indexOf("<Suspense"));
    assert.doesNotMatch(body, /loadDestinationSources|loadVacationSources|factsOf/);
  });

  it("puts a skeleton behind every section that has to wait", () => {
    for (const section of ["WhereToStay", "ThingsToDo", "KosherFood", "KosherSignal", "ShabbosSignal"]) {
      assert.ok(PAGE.includes(`<${section} destination={destination} />`), `${section} is not suspended`);
    }
    // Announced, not merely drawn: a screen reader gets nothing from a grey box.
    assert.match(PAGE, /role="status"/);
    assert.match(PAGE, /aria-busy="true"/);
    assert.match(PAGE, /aria-hidden="true"/);
  });

  it("reads the facts once per request, not once per boundary", () => {
    assert.match(PAGE, /const factsOf = cache\(/);
  });
});

describe("the hub's loading screen belongs to the hub", () => {
  it("DOES NOT SIT ABOVE THE DESTINATION PAGES", () => {
    // A loading.tsx applies to its segment and everything under it. At
    // app/vacation-ideas it was also the boundary for one destination — so a
    // destination page announced "Loading vacation destinations…" over a grid
    // of card outlines, and a wrong address answered 200 with that skeleton on
    // it for ever, because the shell was flushed before notFound() ran.
    assert.equal(existsSync("app/vacation-ideas/loading.tsx"), false);
    assert.ok(existsSync("app/vacation-ideas/(hub)/loading.tsx"));
    assert.ok(existsSync("app/vacation-ideas/(hub)/page.tsx"));
    // A route group changes no URL, which is the point of using one here.
    assert.equal(existsSync("app/vacation-ideas/[destination]/loading.tsx"), false);
  });
});

describe("one destination reads one destination's towns", () => {
  it("narrows the read rather than filtering the whole site in memory", () => {
    assert.match(SOURCES, /loadDestinationSources/);
    assert.match(SOURCES, /getAttractionList\(cities\)/);
    assert.match(SOURCES, /getStayList\(cities\)/);
    assert.match(SOURCES, /getAreaList\(cities\)/);
    assert.match(PAGE, /loadDestinationSources\(destination\)/);
    assert.doesNotMatch(PAGE, /loadVacationSources/);
  });

  it("includes the towns a destination shops in", () => {
    // The alpine case: the scenery is in the valley and the butcher is two
    // hours away. Narrowing the read must not drop the base town, or the page
    // loses the most useful sentence it has.
    assert.match(SOURCES, /kosherBase\?\.cities/);
  });

  it("caches both reads and clears them on the same tag", () => {
    assert.equal(SOURCES.match(/unstable_cache/g)?.length, 3, "one import and two cached reads");
    assert.equal(SOURCES.match(/tags: \[VACATION_SOURCES_TAG\]/g)?.length, 2);
  });
});

describe("search engines can still find them", () => {
  it("lists every destination in the sitemap", () => {
    const paths = new Set(publicPaths().map((entry) => entry.path));
    for (const destination of vacationDestinations) {
      assert.ok(paths.has(`/vacation-ideas/${destination.slug}`), `${destination.slug} is not in the sitemap`);
    }
  });

  it("marks only a destination that does not exist as noIndex", () => {
    const metadata = PAGE.slice(PAGE.indexOf("export async function generateMetadata"), PAGE.indexOf("/**\n * One vacation destination."));
    assert.equal(metadata.match(/noIndex: true/g)?.length, 1);
    // …and that branch is the one that cannot be reached by a real slug.
    assert.match(metadata, /if \(!destination\)/);
  });
});
