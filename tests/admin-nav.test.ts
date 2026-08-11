import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { ADMIN_SECTIONS, activeSection, adminHref, allAdminDestinations, toAdminPath } from "../lib/admin-nav";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// THE ADMIN HOSTNAME SERVES BARE PATHS. admin.…/settings is Settings, and the
// whole point of the hostname is that /admin is not needed. Two things broke
// on it, both because the path the browser reports and the paths written in
// lib/admin-nav.ts stopped being the same string:
//
//   1. Every nav link still carried /admin, so signing in at admin.…/ and
//      clicking anything put you back on admin.…/admin/settings.
//   2. activeSection compared "/settings" against "/admin/settings", matched
//      nothing, and left the highlight on Home wherever you actually were.

describe("a path, whichever hostname reported it", () => {
  test("a bare path becomes the canonical one", () => {
    assert.equal(toAdminPath("/settings"), "/admin/settings");
    assert.equal(toAdminPath("/shomrim"), "/admin/shomrim");
    assert.equal(toAdminPath("/"), "/admin");
  });

  test("a path that is already canonical is left alone", () => {
    assert.equal(toAdminPath("/admin"), "/admin");
    assert.equal(toAdminPath("/admin/settings"), "/admin/settings");
  });
});

describe("a link, written for the hostname you are on", () => {
  test("on the main domain the links keep /admin", () => {
    assert.equal(adminHref("/admin/settings", "/admin"), "/admin/settings");
    assert.equal(adminHref("/admin", "/admin/pages"), "/admin");
  });

  test("on the admin hostname they drop it", () => {
    assert.equal(adminHref("/admin/settings", "/"), "/settings");
    assert.equal(adminHref("/admin/pages", "/shomrim"), "/pages");
  });

  test("the dashboard link becomes the root rather than an empty string", () => {
    assert.equal(adminHref("/admin", "/"), "/");
  });
});

describe("the highlight follows you on both hostnames", () => {
  test("a bare path finds its section", () => {
    // This is the one that was broken: every bare path landed on Home.
    assert.equal(activeSection(toAdminPath("/settings")).label, activeSection("/admin/settings").label);
    assert.notEqual(activeSection(toAdminPath("/settings")).label, "Home");
  });

  test("the dashboard is Home on both", () => {
    assert.equal(activeSection(toAdminPath("/")).label, "Home");
    assert.equal(activeSection("/admin").label, "Home");
  });

  test("every section and child resolves from its bare path too", () => {
    for (const destination of allAdminDestinations()) {
      const bare = destination.href.replace(/^\/admin/, "") || "/";
      assert.equal(
        activeSection(toAdminPath(bare)).label,
        activeSection(destination.href).label,
        `${destination.href} resolves differently on the admin hostname`,
      );
    }
  });
});

describe("the nav and the middleware agree about what a screen is", () => {
  test("every nav destination is a real folder under app/admin", () => {
    // The middleware keeps its own list of admin screens, because it cannot
    // read the filesystem at the edge. A screen in the nav that is not a real
    // folder is a link to nowhere.
    const folders = new Set(
      readdirSync(join(process.cwd(), "app", "admin"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
    for (const destination of allAdminDestinations()) {
      const first = destination.href.split("/")[2];
      if (!first) continue; // "/admin" itself
      assert.ok(folders.has(first), `${destination.href} has no folder app/admin/${first}`);
    }
  });

  test("every section has somewhere to go and something to say", () => {
    for (const section of ADMIN_SECTIONS) {
      assert.ok(section.href.startsWith("/admin"), `${section.label} is not an admin path`);
      assert.ok(section.label.trim() && section.blurb.trim(), `${section.label} is missing its wording`);
    }
  });

  test("Directory destinations include Bulk imports", () => {
    const directory = ADMIN_SECTIONS.find((section) => section.href === "/admin/directory");
    assert.ok(directory, "Directory section is missing");
    const bulk = directory.children?.find((child) => child.href === "/admin/imports");
    assert.ok(bulk, "Directory does not list /admin/imports");
    assert.match(bulk.label, /bulk imports/i);
    assert.ok(
      allAdminDestinations().some((destination) => destination.href === "/admin/imports"),
      "allAdminDestinations() omits /admin/imports",
    );
  });
});

/**
 * Every static admin screen must be discoverable — either listed in
 * allAdminDestinations() (nav + home “Everything you can manage”), or linked
 * from a documented hub. Dynamic detail routes and login are excluded; flow
 * steps that only make sense after a parent screen are allowed when that
 * parent links them.
 */
function listAdminPageRoutes(dir = join(process.cwd(), "app", "admin"), base = "/admin"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("[")) continue; // dynamic segments, e.g. imports/[id]
      out.push(...listAdminPageRoutes(join(dir, entry.name), `${base}/${entry.name}`));
    } else if (entry.name === "page.tsx") {
      out.push(base);
    }
  }
  return out;
}

/** Href strings pulled from Link/Card props in a hub page source. */
function hrefsIn(source: string): Set<string> {
  const found = new Set<string>();
  for (const match of source.matchAll(/href=["'](\/admin[^"']*)["']/g)) {
    found.add(match[1].split("?")[0]);
  }
  return found;
}

describe("every static admin page is reachable from nav or a hub", () => {
  test("no hidden screens outside nav, settings overview, or documented flow steps", () => {
    const destinations = new Set(allAdminDestinations().map((d) => d.href));
    const settingsOverview = hrefsIn(readFileSync(join(process.cwd(), "app", "admin", "settings", "page.tsx"), "utf8"));
    const home = hrefsIn(readFileSync(join(process.cwd(), "app", "admin", "page.tsx"), "utf8"));

    // Flow steps: only useful after the parent screen; parent must link them.
    const flowSteps = new Map<string, { parent: string; parentSource: string }>([
      [
        "/admin/duffel/review",
        { parent: "/admin/duffel", parentSource: readFileSync(join(process.cwd(), "app", "admin", "duffel", "page.tsx"), "utf8") },
      ],
    ]);

    const excluded = new Set(["/admin/login"]);

    for (const route of listAdminPageRoutes()) {
      if (excluded.has(route)) continue;

      if (destinations.has(route)) continue;
      if (settingsOverview.has(route) || home.has(route)) continue;

      const flow = flowSteps.get(route);
      if (flow) {
        assert.ok(
          destinations.has(flow.parent) || settingsOverview.has(flow.parent) || home.has(flow.parent),
          `${route} parent ${flow.parent} is itself unreachable`,
        );
        assert.ok(
          flow.parentSource.includes(route),
          `${route} is a flow step but ${flow.parent} does not link to it`,
        );
        continue;
      }

      assert.fail(
        `${route} is not in allAdminDestinations(), settings overview, home quick links, or a documented flow step`,
      );
    }
  });
});
