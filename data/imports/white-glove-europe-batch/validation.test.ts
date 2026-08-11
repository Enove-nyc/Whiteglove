import assert from "node:assert/strict";
import test from "node:test";

import { validatePack } from "./validate";

test("white-glove europe batch stays a private NEEDS_REVIEW research pack near 700", () => {
  const report = validatePack();

  assert.ok(report.candidateCount >= 650);
  assert.ok(report.candidateCount <= 850);
  assert.ok(report.byCountry.Spain >= 100);
  assert.ok(report.byEntityType.attraction >= 600);
  assert.ok(report.byEntityType.vacation_destination >= 10);
  assert.ok((report.byEntityType.kosher_travel_resource ?? 0) >= 1);

  for (const candidateStatus of Object.values(report.byEntityType)) {
    assert.ok(candidateStatus > 0);
  }
});
