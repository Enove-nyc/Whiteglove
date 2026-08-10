import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { cemeteries } from "@/data/cemeteries";
import { cityGuides } from "@/data/destinations-detailed";
import { bulkDestinations } from "@/data/destinations-bulk";
import { vacationDestinations } from "@/data/vacation-destinations";
import { isPrivatePath, PRIVATE_PATHS, publicPaths } from "@/lib/site-map";
import { allTzaddikim } from "@/lib/tzaddikim";

/**
 * The list of pages given to search engines.
 *
 * THIS EXISTS BECAUSE THERE WAS NO SITEMAP AND NO robots.txt. Both addresses
 * returned the "Destination not found" page — they fell through to the [city]
 * route and were treated as towns — so Google had no list of the three
 * hundred-odd towns, batei hachaim, tzaddikim and guides on the site, and no
 * instruction about where not to go.
 *
 * THE RULE THAT MATTERS MOST is that the sitemap must never submit a page that
 * says noindex. Google reports that as an error against the whole site, and
 * from the outside the two are impossible to reconcile. The walk at the bottom
 * is what keeps them honest as pages are added.
 */

const paths = publicPaths();
const pathSet = new Set(paths.map((p) => p.path));

/** Every page.tsx in the app directory, as a route. */
function routes(dir = "app", prefix = ""): Array<{ route: string; file: string }> {
  const found: Array<{ route: string; file: string }> = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      // Route groups (parentheses) do not appear in the address.
      const segment = name.startsWith("(") ? "" : `/${name}`;
      found.push(...routes(full, `${prefix}${segment}`));
    } else if (name === "page.tsx") {
      found.push({ route: prefix || "/", file: full });
    }
  }
  return found;
}

const ALL_ROUTES = routes();

describe("every page on the site is accounted for", () => {
  it("lists the whole content library", () => {
    // The counts come from the same lists generateStaticParams reads, so a town
    // that exists has a line by construction.
    for (const guide of cityGuides) assert.ok(pathSet.has(`/${guide.slug}`), `missing city guide ${guide.slug}`);
    for (const place of bulkDestinations) assert.ok(pathSet.has(`/heritage/towns/${place.slug}`), place.slug);
    for (const cemetery of cemeteries) assert.ok(pathSet.has(`/cemeteries/${cemetery.slug}`), cemetery.slug);
    for (const t of allTzaddikim()) assert.ok(pathSet.has(`/tzaddikim/${t.slug}`), t.slug);
    for (const d of vacationDestinations) assert.ok(pathSet.has(`/destinations/${d.slug}`), d.slug);
  });

  it("is actually a big list, not an empty one that looks fine", () => {
    // The failure mode this guards is a sitemap that builds, validates and
    // contains six pages.
    assert.ok(paths.length > 200, `only ${paths.length} addresses`);
  });

  it("has the front page first and at the top priority", () => {
    assert.equal(paths[0].path, "/");
    assert.equal(paths[0].priority, 1);
  });

  it("never lists the same address twice", () => {
    // A guide and a bulk destination can share a slug.
    assert.equal(pathSet.size, paths.length);
  });

  it("gives every entry a usable priority and frequency", () => {
    for (const entry of paths) {
      assert.ok(entry.priority > 0 && entry.priority <= 1, `${entry.path}: ${entry.priority}`);
      assert.ok(entry.changeFrequency.length > 2, entry.path);
    }
  });

  it("uses paths, not URLs — the host is added once, from the configured address", () => {
    for (const entry of paths) assert.match(entry.path, /^\//, entry.path);
  });
});

describe("nothing private is offered to a crawler", () => {
  it("keeps every private address out of the list", () => {
    for (const entry of paths) assert.equal(isPrivatePath(entry.path), false, entry.path);
  });

  it("matches a whole segment, not a prefix of a word", () => {
    // "/accounts-payable" is not "/account", and "/logins" is not "/login".
    assert.equal(isPrivatePath("/account"), true);
    assert.equal(isPrivatePath("/account/settings"), true);
    assert.equal(isPrivatePath("/accountants"), false);
    assert.equal(isPrivatePath("/i/abc123"), true);
    assert.equal(isPrivatePath("/israel"), false);
  });

  it("covers the doors and the machinery", () => {
    for (const p of ["/admin", "/api", "/login", "/access", "/version"]) {
      assert.ok((PRIVATE_PATHS as readonly string[]).includes(p), p);
    }
  });
});

describe("the sitemap and the pages agree about indexing", () => {
  it("SUBMITS NOTHING THAT SAYS NOINDEX", () => {
    // THE ONE THAT MATTERS. A page in the sitemap that refuses indexing is
    // reported by Google as an error against the whole site. This walks the app
    // directory rather than trusting a list, so a page that starts refusing
    // indexing tomorrow fails here today.
    const contradictions: string[] = [];
    for (const { route, file } of ALL_ROUTES) {
      if (route.includes("[")) continue; // dynamic routes are checked by their lists above
      if (!pathSet.has(route)) continue; // not offered, so nothing to contradict
      const source = readFileSync(file, "utf8");
      // Only an unconditional refusal counts. Several pages set noIndex on the
      // not-found branch alone, which is correct and must not fail this.
      if (/noIndex:\s*true/.test(source) && !/if\s*\(!/.test(source.slice(0, source.indexOf("noIndex: true")))) {
        contradictions.push(route);
      }
    }
    assert.deepEqual(contradictions, [], `in the sitemap and marked noindex: ${contradictions.join(", ")}`);
  });

  it("offers no page that does not exist", () => {
    // A static entry left behind after a page is deleted is a 404 handed to
    // Google on purpose.
    const real = new Set(ALL_ROUTES.map((r) => r.route));
    const missing = paths
      .filter(
        (entry) =>
          // Each of these is served by one dynamic route, which the walk below
          // sees as a single entry with a bracket in it rather than as the
          // hundred-odd addresses it answers.
          !entry.path.startsWith("/heritage/towns/") &&
          !entry.path.startsWith("/cemeteries/") &&
          !entry.path.startsWith("/tzaddikim/") &&
          !(entry.path.startsWith("/destinations/") && entry.path !== "/destinations"),
      )
      // A city guide is served by the [city] route rather than a folder.
      .filter((entry) => !cityGuides.some((g) => `/${g.slug}` === entry.path))
      .filter((entry) => !real.has(entry.path))
      .map((entry) => entry.path);
    assert.deepEqual(missing, [], `in the sitemap with no page behind it: ${missing.join(", ")}`);
  });
});

describe("robots.txt and the sitemap read one list", () => {
  it("builds the disallow list from PRIVATE_PATHS rather than its own copy", () => {
    // Two hand-written lists is how a page ends up submitted in one and
    // forbidden in the other.
    const robots = readFileSync("app/robots.ts", "utf8");
    assert.match(robots, /PRIVATE_PATHS/);
    assert.doesNotMatch(robots, /disallow:\s*\[\s*"/, "the disallow list is hand-written here as well");
  });

  it("points at the sitemap, and only with a real address", () => {
    const robots = readFileSync("app/robots.ts", "utf8");
    assert.match(robots, /sitemap\.xml/);
    assert.match(robots, /origin \?/, "it would emit a relative sitemap line with no address set");
  });

  it("BLOCKS THE BARE ADDRESS AS WELL AS WHAT IS UNDER IT", () => {
    // robots.txt matches on prefix, so "Disallow: /admin/" leaves /admin itself
    // crawlable — the admin front door, in an index. Caught by reading the
    // generated file rather than the source.
    const robots = readFileSync("app/robots.ts", "utf8");
    assert.match(robots, /\$\{path\}\$/, "the exact address is not disallowed, only what is under it");
    assert.match(robots, /\$\{path\}\//, "what is under the address is not disallowed");
  });

  it("does not pretend to be a security measure", () => {
    // robots.txt is a request, and a public list of where the interesting
    // things are. The comment has to say so, because somebody will read this
    // file as protection for /admin.
    assert.match(readFileSync("app/robots.ts", "utf8"), /NOT A SECURITY MEASURE/);
  });
});
