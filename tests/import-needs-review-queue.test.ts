import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getImportReviewQueue, isOpenReviewStatus } from "@/lib/import-review-queue";

describe("import needs-review queue", () => {
  it("carries only genuinely outstanding work, and never retired research packs", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const queue = await getImportReviewQueue();
      assert.equal(queue.error, null);
      assert.ok(queue.items.every((item) => item.origin === "source_pack" || item.origin === "database"));
      assert.ok(queue.items.every((item) => item.href.startsWith("/admin/imports")));
      // Every remaining item is genuinely open work, never a reconciled duplicate.
      assert.equal(queue.counts.duplicates, 0);
      assert.ok(queue.items.every((item) => item.status === "NEEDS_REVIEW" || item.status === "AWAITING_VERIFICATION"));
      assert.ok(queue.packs.every((pack) => pack.path.startsWith("data/imports/")));
      // The retired research and already-live packs are gone from the queue at
      // the owner's decision: the europe / global / fill bare-name packs, the
      // worldwide editorial packs 2 and 5 (the same bare / machine-drafted
      // research), and the Nesiya Tova heritage pack (whose content is already
      // live in data/heritage-cemeteries.ts). None may appear as a pack or an item.
      const retired = [
        "white-glove-europe-batch",
        "white-glove-global-batch",
        "white-glove-fill-batch",
        "worldwide-batch-2",
        "worldwide-batch-5",
        "nesiyatova-heritage-batch",
      ];
      for (const slug of retired) {
        assert.ok(!queue.packs.some((pack) => pack.slug === slug), `${slug} should be retired`);
        assert.ok(!queue.items.some((item) => item.batchSlug === slug), `${slug} should have no items`);
      }
      assert.ok(!queue.items.some((item) => /openstreetmap|overpass|photon/i.test(`${item.name} ${item.batchName}`)));
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it("treats needs-review and awaiting-verification as open work", () => {
    assert.equal(isOpenReviewStatus("NEEDS_REVIEW"), true);
    assert.equal(isOpenReviewStatus("AWAITING_VERIFICATION"), true);
    assert.equal(isOpenReviewStatus("DUPLICATE"), true);
    assert.equal(isOpenReviewStatus("PUBLISHED"), false);
    assert.equal(isOpenReviewStatus("REJECTED"), false);
  });

  it("is reachable from admin nav and the dashboard attention area", () => {
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    const home = readFileSync("app/admin/page.tsx", "utf8");
    const directory = readFileSync("app/admin/directory/page.tsx", "utf8");
    assert.match(nav, /\/admin\/imports\/needs-review/);
    assert.match(nav, /Needs review/);
    assert.match(home, /\/admin\/imports\/needs-review/);
    assert.match(directory, /AdminSectionScreens/);
    assert.match(directory, /sectionHref="\/admin\/directory"/);
  });

  it("Directory hub exposes Bulk imports, not only Needs review", () => {
    const directory = readFileSync("app/admin/directory/page.tsx", "utf8");
    const nav = readFileSync("lib/admin-nav.ts", "utf8");
    assert.match(directory, /AdminSectionScreens/);
    assert.match(directory, /sectionHref="\/admin\/directory"/);
    assert.match(nav, /href: "\/admin\/imports"/);
    assert.match(nav, /Bulk imports/);
  });

  it("Needs review queue exposes clickable count filters and an Open review action", () => {
    const queue = readFileSync("components/ImportNeedsReviewQueue.tsx", "utf8");
    assert.match(queue, /function CountCard/);
    assert.match(queue, /aria-pressed=\{active\}/);
    assert.match(queue, /Open review/);
    assert.match(queue, /Open Bulk imports/);
    assert.match(queue, /source_pack/);
    assert.match(queue, /applyCountFilter/);
  });
});
