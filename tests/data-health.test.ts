import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dataHealth, healthChecks, healthSummary } from "@/lib/data-health";
import { codeOf } from "./helpers/source";

describe("what the screen counts", () => {
  it("counts real records rather than a hand-kept list", () => {
    const checks = healthChecks();
    assert.ok(checks.length > 0);
    for (const check of checks) {
      assert.ok(check.total > 0, `${check.id} counts nothing at all`);
      assert.ok(check.affected <= check.total, `${check.id} says more are missing than exist`);
      assert.ok(check.costs.trim().length > 20, `${check.id} does not say what the gap costs`);
      assert.match(check.href, /^\/admin\//, `${check.id} does not open an admin screen`);
    }
  });

  it("shows nothing for a check with nothing missing", () => {
    // A list of green rows is a list to scroll past.
    assert.ok(dataHealth().every((check) => check.affected > 0));
  });

  it("puts what breaks a feature above what merely thins a page", () => {
    const order = dataHealth().map((check) => check.severity);
    const firstThin = order.indexOf("thin");
    const lastBreaks = order.lastIndexOf("breaks");
    if (firstThin >= 0 && lastBreaks >= 0) assert.ok(lastBreaks < firstThin, "a thin row sorted above a breaking one");
    const firstDeliberate = order.indexOf("deliberate");
    if (firstDeliberate >= 0 && firstThin >= 0) assert.ok(firstThin < firstDeliberate);
  });

  it("counts a big set and a small one the same way", () => {
    const food = healthChecks().find((check) => check.id === "food-no-position");
    assert.ok(food && food.total > 1000, "the food listings are the largest set and should be counted whole");
  });
});

describe("it never asks him to invent anything", () => {
  it("marks the kever coordinates as blank on purpose, not as work outstanding", () => {
    const graves = healthChecks().find((check) => check.id === "cemeteries-no-position");
    assert.equal(graves?.severity, "deliberate");
    assert.match(graves?.costs ?? "", /on purpose/i);
    assert.match(graves?.costs ?? "", /only when you know the actual grave/i);
  });

  it("says so on the screen as well, and offers nothing to open for it", () => {
    const page = codeOf("app/admin/data-health/page.tsx");
    assert.match(page, /Blank on purpose/);
    assert.match(page, /check\.severity !== "deliberate"/);
  });
});

describe("the summary line", () => {
  it("counts only what switches a feature off", () => {
    const line = healthSummary(dataHealth());
    assert.match(line, /feature/);
  });

  it("says so plainly when there is nothing breaking", () => {
    assert.match(healthSummary([]), /Nothing on the site is missing/);
  });
});

describe("it works without the database", () => {
  it("reads the built-in content and nothing else", () => {
    // Numbers that vanish when a cache is down read as the content having
    // vanished — the same rule lib/admin-overview.ts follows.
    const source = codeOf("lib/data-health.ts");
    assert.doesNotMatch(source, /redis|upstash|prisma|fetch\(|await /i);
  });
});
