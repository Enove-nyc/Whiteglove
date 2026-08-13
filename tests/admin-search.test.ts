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
    assert.ok(rows.some((row) => row.batchSlug === "white-glove-europe-batch"));
  });
});
