import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe } from "node:test";
import { searchAdmin } from "../lib/admin-search";
import { listSourcePackSearchRows } from "../lib/import-review-queue";

describe("admin chrome search", () => {
  test("lives in the admin header and is not the public site search", () => {
    const shell = readFileSync("components/AdminShell.tsx", "utf8");
    const search = readFileSync("components/AdminSearch.tsx", "utf8");
    assert.match(shell, /AdminSearch/);
    assert.match(search, /Search listings, candidates and admin screens/);
    assert.match(search, /Find a page/);
    assert.doesNotMatch(search, /Search the entire White Glove site/);
    assert.match(search, /ArrowDown/);
    assert.match(search, /role="listbox"/);
    assert.match(readFileSync("app/api/admin/search/route.ts", "utf8"), /searchAdmin/);
  });

  test("screens for earnings, trello, ratings and needs review are findable", async () => {
    const esim = await searchAdmin("esim", { limit: 20 });
    assert.ok(
      esim.results.some((h) => h.href.includes("/admin/settings/earnings") || /esim|essential/i.test(`${h.title} ${h.subtitle}`)),
      `esim should reach Travel Essentials / earnings, got ${esim.results.map((h) => h.href).join(", ") || "(none)"}`,
    );

    const trello = await searchAdmin("trello", { limit: 15 });
    assert.ok(trello.results.some((h) => /trello/i.test(h.title) || h.href.includes("trello")));

    const ratings = await searchAdmin("ratings", { limit: 15 });
    assert.ok(ratings.results.some((h) => h.href.includes("/admin/ratings")));

    const review = await searchAdmin("needs review", { limit: 15 });
    assert.ok(review.results.some((h) => h.href.includes("/admin/imports/needs-review")));
  });

  test("pack candidates are readable for search without rewriting pack files", () => {
    const rows = listSourcePackSearchRows();
    assert.ok(rows.length > 0, "expected NEEDS_REVIEW pack rows");
    assert.ok(rows.every((row) => row.href.startsWith("/admin/imports")));
    assert.ok(rows.some((row) => row.batchSlug === "kosher-food-batch"));
    // The retired research packs are out of the queue and its search entirely.
    for (const retired of ["worldwide-batch-2", "worldwide-batch-5", "nesiyatova-heritage-batch"]) {
      assert.ok(!rows.some((row) => row.batchSlug === retired), `${retired} should be retired from search`);
    }
  });
});

describe("searching for a thing finds the thing", () => {
  /**
   * EVERY SETTINGS SCREEN USED TO MATCH EVERY SETTINGS WORD.
   *
   * A section's `keywords` is the union of what all its screens are about —
   * Settings carries ninety words covering Duffel, Trello, eSIM, Amazon,
   * insurance, voting and the rest — and allAdminDestinations handed that same
   * list to every child. So all fifteen Settings screens scored identically
   * for every one of those words, and identical means alphabetical:
   *
   *   "esim"   → About, Case studies, Collaboration, Connections, Duffel, …
   *   "voting" → About, Case studies, Collaboration, Connections, Duffel, …
   *
   * The right screen was not in the first eight for either of them. The owner
   * searching for a thing got a list of everything except it.
   *
   * The blob stays on the section's own row, which is what makes a broad word
   * find the section. Its words are now also on the screens they describe.
   */
  const OWNS: Array<[string, string]> = [
    ["duffel", "Duffel"],
    ["trello", "Trello"],
    ["amazon", "Travel gear"],
    ["esim", "Earnings"],
    ["insurance", "Earnings"],
    ["voting", "Collaboration"],
    ["security", "Security policy"],
  ];

  for (const [query, screen] of OWNS) {
    test(`"${query}" finds ${screen}`, async () => {
      const res = await searchAdmin(query, { areas: null, limit: 8 });
      const titles = res.results.map((r) => r.title);
      assert.ok(titles.includes(screen), `"${query}" → ${titles.join(", ") || "nothing"}`);
    });
  }

  test("does not answer with every screen in the section", async () => {
    // The measure that catches the regression: a word that belongs to one
    // screen must not return most of its siblings.
    for (const [query] of OWNS) {
      const res = await searchAdmin(query, { areas: null, limit: 8 });
      const settings = res.results.filter((r) => r.subtitle.startsWith("Settings"));
      assert.ok(settings.length <= 3, `"${query}" returned ${settings.length} Settings screens: ${settings.map((s) => s.title).join(", ")}`);
    }
  });

  test("a child never inherits its section's keyword list", async () => {
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    // The section's own row is the ONE place section.keywords is read. A
    // second reading of it is a child inheriting the blob again.
    assert.equal((nav.match(/keywords: section\.keywords/g) ?? []).length, 1);
    assert.match(nav, /keywords: child\.keywords \?\? ""/);
  });

  test("the section itself is still found by a word from any of its screens", async () => {
    // That is what the blob is for, and it stays where it works.
    const res = await searchAdmin("esim", { areas: null, limit: 8 });
    assert.ok(res.results.some((r) => r.title === "Settings"));
  });
});
