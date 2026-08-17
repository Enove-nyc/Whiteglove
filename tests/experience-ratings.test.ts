import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  rateHref,
  ratingProblem,
  ratingSummary,
  averageScore,
  nearestScoreLabel,
  filterExperienceRatings,
  SCORE_LABELS,
} from "@/lib/experience-ratings";

const good = {
  kind: "listing",
  ref: "colosseum",
  label: "The Colosseum",
  score: 3,
  name: "A. Klein",
  email: "a@example.com",
  note: "Glad we went mid-morning.",
};

describe("what a rating has to carry", () => {
  it("accepts a complete one", () => {
    assert.equal(ratingProblem(good), null);
  });

  it("needs to know what it is about", () => {
    assert.match(ratingProblem({ ...good, kind: "hotel" })!, /what this is about/i);
    assert.match(ratingProblem({ ...good, ref: "" })!, /what this is about/i);
    assert.match(ratingProblem({ ...good, label: "  " })!, /what this is about/i);
  });

  it("needs a score from one to three", () => {
    assert.match(ratingProblem({ ...good, score: 0 })!, /how it went/i);
    assert.match(ratingProblem({ ...good, score: 4 })!, /how it went/i);
    assert.match(ratingProblem({ ...good, score: 5 })!, /how it went/i);
  });

  it("needs a name and a real address", () => {
    assert.match(ratingProblem({ ...good, name: " " })!, /your name/i);
    assert.match(ratingProblem({ ...good, email: "nope" })!, /email/i);
  });
});

describe("rating copy helpers", () => {
  it("builds a /rate link with the target filled in", () => {
    const href = rateHref({ kind: "trip", ref: "trip-1", label: "Kraków" });
    assert.match(href, /^\/rate\?/);
    assert.match(href, /kind=trip/);
    assert.match(href, /ref=trip-1/);
  });

  it("summarises for the admin list without stars", () => {
    assert.equal(ratingSummary({ score: 2, kind: "listing", label: "Merano" }), "Fine · listing · Merano");
    assert.equal(SCORE_LABELS[3], "Glad we went");
    assert.equal(Object.keys(SCORE_LABELS).length, 3);
  });

  it("averages on the three-point scale", () => {
    assert.equal(averageScore([1, 3, 3]), 7 / 3);
    assert.equal(nearestScoreLabel(2.6), "Glad we went");
    assert.equal(averageScore([5, 4]), null);
  });

  it("filters the admin inbox by kind, score and words", () => {
    const rows = [
      { ...good, id: "1", kind: "listing" as const, score: 3 as const, at: "2026-03-03T00:00:00.000Z", label: "The Colosseum", email: "a@example.com" },
      { ...good, id: "2", kind: "trip" as const, score: 1 as const, at: "2026-03-03T00:00:00.000Z", label: "Kraków", email: "b@example.com", name: "B. Cohen" },
    ];
    assert.equal(filterExperienceRatings(rows, { kind: "trip" }).length, 1);
    assert.equal(filterExperienceRatings(rows, { score: "3" })[0].id, "1");
    assert.equal(filterExperienceRatings(rows, { q: "cohen" })[0].id, "2");
  });
});

describe("the private rating API", () => {
  it("refuses a request with no account session", () => {
    const source = readFileSync("app/api/ratings/route.ts", "utf8");
    assert.match(source, /readSessionEmail\(/);
    assert.match(source, /Sign in to rate/);
  });
});
