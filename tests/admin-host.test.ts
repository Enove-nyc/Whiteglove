import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminHostEntry,
  publicAdminHref,
  safeAdminNext,
  stripAdminPrefix,
  toCanonicalAdminPath,
} from "../lib/admin-host";

describe("admin host paths", () => {
  it("strips /admin to the bare path and keeps query callers honest", () => {
    assert.equal(stripAdminPrefix("/admin"), "/");
    assert.equal(stripAdminPrefix("/admin/imports/needs-review"), "/imports/needs-review");
  });

  it("maps operational aliases to existing screens", () => {
    assert.equal(toCanonicalAdminPath("/users"), "/admin/accounts");
    assert.equal(toCanonicalAdminPath("/audit-log"), "/admin/history");
    assert.equal(toCanonicalAdminPath("/providers"), "/admin/directory/businesses");
    assert.equal(toCanonicalAdminPath("/admin/users"), "/admin/accounts");
  });

  it("refuses an off-site or protocol-relative next", () => {
    assert.equal(safeAdminNext("https://evil.example/"), "/admin");
    assert.equal(safeAdminNext("//evil.example"), "/admin");
    assert.equal(safeAdminNext("/login"), "/admin");
    assert.equal(safeAdminNext("/imports/needs-review?q=rome"), "/admin/imports/needs-review?q=rome");
  });

  it("sends an old /admin URL to the bare path in one hop when signed in", () => {
    const entry = adminHostEntry("/admin/imports/needs-review", "?q=rome", true);
    assert.deepEqual(entry, {
      kind: "redirect",
      pathname: "/imports/needs-review",
      search: "?q=rome",
      permanent: true,
    });
  });

  it("sends a signed-out /admin URL straight to login with next, not through the bare path", () => {
    const entry = adminHostEntry("/admin/imports/needs-review", "?q=rome", false);
    assert.equal(entry.kind, "redirect");
    if (entry.kind !== "redirect") return;
    assert.equal(entry.pathname, "/login");
    assert.equal(entry.permanent, false);
    assert.match(entry.search, /next=/);
    assert.match(decodeURIComponent(entry.search), /\/imports\/needs-review\?q=rome/);
  });

  it("writes links without /admin on the admin host", () => {
    assert.equal(publicAdminHref("/admin/ratings", true), "/ratings");
    assert.equal(publicAdminHref("/admin", true), "/");
    assert.equal(publicAdminHref("/admin/ratings", false), "/admin/ratings");
  });
});
