import assert from "node:assert/strict";
import test from "node:test";

import { validatePack } from "./validate";

test("white-glove global batch stays a private NEEDS_REVIEW research pack near 650", () => {
  const report = validatePack();

  assert.ok(report.candidateCount >= 600);
  assert.ok(report.candidateCount <= 750);
  assert.ok(report.byCountry["United States"] >= 150);
  assert.ok(report.byEntityType.attraction >= 500);
  assert.ok(report.byEntityType.vacation_destination >= 10);
  assert.ok((report.byEntityType.kosher_travel_resource ?? 0) >= 5);
  assert.ok(report.byMarket["usa-san-francisco"] > 0);
  assert.ok(report.byMarket["thailand-bangkok"] > 0);
  assert.ok(report.byMarket["taiwan-taipei"] > 0);

  // No Florida / Orlando markets in this pack.
  for (const market of Object.keys(report.byMarket)) {
    assert.doesNotMatch(market, /orlando|florida/i);
  }
});
