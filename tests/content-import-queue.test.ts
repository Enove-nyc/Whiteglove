import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getContentImportDashboard } from "@/lib/content-imports";

describe("bulk content review queue without a database", () => {
  // This used to assert that the dashboard was empty, which it was only because
  // the built-in package list was an empty array. The packs are registered now,
  // so emptiness was never the property worth protecting: what matters is that
  // with no database to write to, a source package is offered as a PREVIEW and
  // nothing is claimed as staged or published.
  it("previews the source packages but claims nothing staged or published", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const dashboard = await getContentImportDashboard();
      assert.equal(dashboard.configured, false);
      assert.equal(dashboard.databaseReady, false);
      assert.equal(dashboard.counts.published, 0);
      assert.equal(dashboard.counts.publishable, 0);

      // The packages are visible so an editor can read what is on offer...
      assert.ok(dashboard.batches.length >= 4);
      assert.ok(dashboard.candidates.length > 0);
      // ...but not one of them is recorded as having reached the database.
      assert.ok(dashboard.batches.every((batch) => batch.stagedCandidates === 0));
      assert.ok(dashboard.candidates.every((candidate) => candidate.status !== "PUBLISHED"));
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });

  it("keeps a preview out of the review queue's database rows", async () => {
    // The regression that registering the packs exposed: the needs-review queue
    // read dashboard.candidates as staged rows whatever databaseReady said, so
    // a preview became 1,695 "database" items whose review links pointed at ids
    // that existed in no table.
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const { getImportReviewQueue } = await import("@/lib/import-review-queue");
      const queue = await getImportReviewQueue();
      assert.equal(queue.error, null);
      assert.ok(queue.counts.sourcePackOnly > 0);
      assert.ok(queue.items.every((item) => item.origin === "source_pack"));
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
