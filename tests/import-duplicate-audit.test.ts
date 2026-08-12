import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * The owner's standing requirement: not one overlapping listing anywhere in the
 * import packs. This walks every candidate against every other one — slugs,
 * source IDs, exact and soft names, aliases, street addresses, adjacent-city
 * copies and near-duplicate pairs — and fails with the offending rows named.
 */
describe("import packs carry no overlapping listings", () => {
  it("finds no duplicate of any kind across every pack", async () => {
    const { auditImportDuplicates, loadAllCandidates } = await import("../scripts/audit-import-duplicates.mjs");
    const rows = loadAllCandidates();
    assert.ok(rows.length > 20_000, `expected the full packs, loaded ${rows.length}`);

    const result = auditImportDuplicates(rows);
    const offenders = Object.entries(result.findings)
      .filter(([, list]) => list.length > 0)
      .map(([check, list]) => `${check}: ${list.slice(0, 3).map((group) => group.members.join(" / ")).join(" | ")}`);

    assert.deepEqual(offenders, [], offenders.join("\n"));
    assert.equal(result.overlaps, 0);
  });
});
