import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { ADMIN_SECTIONS, activeSection, adminHref, allAdminDestinations, toAdminPath } from "../lib/admin-nav";
import { readdirSync } from "node:fs";
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
});
