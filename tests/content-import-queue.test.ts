import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getContentImportDashboard } from "@/lib/content-imports";

describe("bulk content review queue without a database", () => {
  it("shows no staged public content when the built-in package list is empty", async () => {
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const dashboard = await getContentImportDashboard();
      assert.equal(dashboard.configured, false);
      assert.equal(dashboard.databaseReady, false);
      assert.equal(dashboard.counts.readyToStage, 0);
      assert.equal(dashboard.counts.published, 0);
      assert.equal(dashboard.candidates.length, 0);
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
