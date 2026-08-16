import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_REVIEW_LENGTH,
  REVIEW_SCORES,
  REVIEW_SCORE_LABELS,
  averageReviewScore,
  initialsOf,
  isSacredPlaceKind,
  nearestReviewScore,
  reviewProblem,
  reviewTextProblem,
  toPublicReview,
  type PlaceReview,
} from "@/lib/place-reviews";

// The public reviews rules. NOT lib/experience-ratings.ts — that one is the
// owner's private inbox and publishes nothing; these rules govern what a
// stranger writes onto a public page, which is why the safeguards live here.

describe("the scale", () => {
  it("is three, and the three words are Poor, Good, Excellent", () => {
    // The owner's decision — not five stars, not the hotel-star system.
    assert.deepEqual([...REVIEW_SCORES], [1, 2, 3]);
    assert.deepEqual(REVIEW_SCORE_LABELS, { 1: "Poor", 2: "Good", 3: "Excellent" });
  });

  it("rounds a mean back onto the scale, never off it", () => {
    assert.equal(averageReviewScore([1, 2, 3]), 2);
    assert.equal(averageReviewScore([]), null);
    // Scores that never came from the scale do not drag the mean around.
    assert.equal(averageReviewScore([3, 3, 99, 0]), 3);
    assert.equal(nearestReviewScore(2.6), 3);
    assert.equal(nearestReviewScore(1.4), 1);
    assert.equal(nearestReviewScore(17), 3);
  });
});

describe("initials, which are all the public ever sees of a name", () => {
  it("takes the first letter of the first and last word", () => {
    assert.equal(initialsOf("Yaakov Cohen"), "YC");
    assert.equal(initialsOf("sara leah levy"), "SL");
  });

  it("gives one letter for one word", () => {
    assert.equal(initialsOf("Rivka"), "R");
  });

  it("handles a Hebrew name, which has no upper case", () => {
    assert.equal(initialsOf("יעקב כהן"), "יכ");
    assert.equal(initialsOf("מלכה"), "מ");
  });

  it("gives ? when there is no name at all", () => {
    assert.equal(initialsOf(""), "?");
    assert.equal(initialsOf("   "), "?");
    assert.equal(initialsOf(undefined), "?");
  });

  it("is not confused by extra spaces", () => {
    assert.equal(initialsOf("  Yaakov   Moshe   Cohen  "), "YC");
  });
});

describe("what may be written", () => {
  it("accepts a rating with no words at all", () => {
    // Demanding a sentence produces "nice place", which says nothing.
    assert.equal(reviewTextProblem(""), null);
    assert.equal(reviewTextProblem(undefined), null);
    assert.equal(
      reviewProblem({ placeKind: "stay", placeRef: "hotel-x", placeLabel: "Hotel X", score: 3 }),
      null,
    );
  });

  it("accepts ordinary words about a place", () => {
    assert.equal(reviewTextProblem("The mikvah was spotless and the attendant let us in early."), null);
    assert.equal(reviewTextProblem("We were 4 adults and 2 children, June 2026. Plenty of room."), null);
  });

  it("rejects links, however they are dressed", () => {
    assert.ok(reviewTextProblem("great deals at http://spam.example/x"));
    assert.ok(reviewTextProblem("see www.cheap-rooms.info"));
    assert.ok(reviewTextProblem("book through best-tours.com instead"));
    // A typo that only looks like a domain is not a link.
    assert.equal(reviewTextProblem("It was quiet.Beautifully so."), null);
  });

  it("rejects phone numbers but not seasons or coordinates", () => {
    assert.ok(reviewTextProblem("call me on 054-123-4567 for a private tour"));
    assert.ok(reviewTextProblem("WhatsApp +44 7911 123456"));
    assert.equal(reviewTextProblem("open through the 2024-2026 season"), null);
    assert.equal(reviewTextProblem("the gate is at 50.0619, 19.9368"), null);
  });

  it("rejects foul language", () => {
    assert.ok(reviewTextProblem("this place is shit"));
  });

  it("holds the line at 2,000 characters", () => {
    assert.equal(reviewTextProblem("a".repeat(MAX_REVIEW_LENGTH)), null);
    assert.ok(reviewTextProblem("a".repeat(MAX_REVIEW_LENGTH + 1)));
  });

  it("refuses a review of nothing in particular", () => {
    assert.ok(reviewProblem({ placeKind: "casino", placeRef: "x", placeLabel: "X", score: 2 }));
    assert.ok(reviewProblem({ placeKind: "stay", placeRef: "  ", placeLabel: "X", score: 2 }));
    assert.ok(reviewProblem({ placeKind: "stay", placeRef: "x", placeLabel: "X", score: 5 }));
  });
});

describe("what leaves the server", () => {
  const stored: PlaceReview = {
    id: "r1",
    placeKind: "stay",
    placeRef: "hotel-x",
    placeLabel: "Hotel X",
    score: 3,
    text: "Quiet, and near the shul.",
    authorEmail: "yaakov@example.com",
    authorName: "Yaakov Cohen",
    status: "PUBLISHED",
    reportCount: 0,
    at: "2026-08-01T00:00:00.000Z",
  };

  it("carries initials and never the name or the email", () => {
    const pub = toPublicReview(stored, null);
    assert.equal(pub.initials, "YC");
    const words = JSON.stringify(pub);
    assert.ok(!words.includes("Yaakov"), "the author's name reached the public shape");
    assert.ok(!words.includes("example.com"), "the author's email reached the public shape");
  });

  it("marks a review as mine only for its own author", () => {
    assert.equal(toPublicReview(stored, "yaakov@example.com").mine, true);
    assert.equal(toPublicReview(stored, "somebody@else.example").mine, false);
    assert.equal(toPublicReview(stored, null).mine, false);
  });

  it("keeps the avatar seam open for the account system", () => {
    assert.equal(toPublicReview(stored, null).avatarUrl, undefined);
    assert.equal(toPublicReview({ ...stored, avatarUrl: "/a.jpg" }, null).avatarUrl, "/a.jpg");
  });
});

describe("sacred places", () => {
  it("are the four kinds whose section is visitor experience, not a verdict", () => {
    for (const kind of ["shul", "mikvah", "kever", "cemetery"]) assert.ok(isSacredPlaceKind(kind), kind);
    for (const kind of ["destination", "attraction", "eatery", "stay", "listing"]) {
      assert.ok(!isSacredPlaceKind(kind), kind);
    }
  });
});
