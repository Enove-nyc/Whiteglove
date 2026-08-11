import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getImportReviewQueue, isOpenReviewStatus } from "@/lib/import-review-queue";

describe("import needs-review queue", () => {
  it("lists private source-pack candidates that still await verification", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const queue = await getImportReviewQueue();
      assert.equal(queue.error, null);
      assert.ok(queue.packs.length >= 2);
      assert.ok(queue.counts.awaitingVerification > 0);
      assert.ok(queue.counts.sourcePackOnly > 0);
      assert.ok(queue.items.every((item) => item.origin === "source_pack" || item.origin === "database"));
      assert.ok(queue.items.every((item) => item.href.startsWith("/admin/imports")));
      assert.ok(queue.items.some((item) => item.batchSlug === "worldwide-batch-2"));
      assert.ok(queue.items.some((item) => item.batchSlug === "white-glove-fill-batch"));
      assert.ok(queue.items.some((item) => item.batchSlug === "white-glove-europe-batch"));
      assert.ok(queue.items.some((item) => item.batchSlug === "white-glove-global-batch"));
      assert.ok(queue.packs.every((pack) => pack.path.startsWith("data/imports/")));
      const europePack = queue.packs.find((pack) => pack.slug === "white-glove-europe-batch");
      const globalPack = queue.packs.find((pack) => pack.slug === "white-glove-global-batch");
      assert.ok((europePack?.candidateCount ?? 0) >= 650);
      assert.ok((globalPack?.candidateCount ?? 0) >= 600);
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
    assert.match(directory, /\/admin\/imports\/needs-review/);
  });

  it("Directory hub exposes Bulk imports, not only Needs review", () => {
    const directory = readFileSync("app/admin/directory/page.tsx", "utf8");
    assert.match(directory, /href="\/admin\/imports"/);
    assert.match(directory, /Bulk imports/);
  });
});
