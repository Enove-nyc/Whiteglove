import assert from "node:assert/strict";
import test from "node:test";

import { validatePack } from "./validate";

test("white-glove fill batch stays a reviewed, source-complete complementary pack", () => {
  const report = validatePack();

  assert.equal(report.candidateCount, 94);
  assert.deepEqual(report.byCountry, {
    "Hong Kong": 19,
    Netherlands: 18,
    "New Zealand": 16,
    "South Korea": 20,
    "United States": 21,
  });
  assert.equal(report.byEntityType.vacation_destination, 4);
  assert.equal(report.byEntityType.stay_anchor, 4);
  assert.equal(report.byEntityType.kosher_travel_resource, 4);
  assert.equal(report.byEntityType.attraction, 82);
});
