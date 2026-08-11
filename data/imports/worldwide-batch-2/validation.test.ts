import assert from "node:assert/strict";
import test from "node:test";

import { validateWorldwideBatch2 } from "./validate";

test("worldwide batch 2 stays a reviewed, source-complete pack", () => {
  const report = validateWorldwideBatch2();

  assert.equal(report.candidateCount, 152);
  assert.deepEqual(report.byCountry, {
    Argentina: 22,
    Canada: 38,
    Greece: 44,
    Portugal: 48,
  });
  assert.equal(report.byEntityType.vacation_destination, 9);
  assert.equal(report.byEntityType.stay_anchor, 2);
  assert.equal(report.byEntityType.kosher_travel_resource, 12);
});
