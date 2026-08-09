import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPhotoOwnerKind, pathsToRefresh, photoDecision } from "@/lib/photos";

/**
 * A photograph belongs to whoever took it.
 *
 * The site is a commercial one, and publishing somebody's picture on it with
 * no attribution is not a display bug — it is taking their work. These tests
 * are about the one rule that stops it, and about the pictures landing on the
 * page they are pictures of.
 */

describe("publishing a picture", () => {
  it("holds a picture back when nobody has said whose it is", () => {
    const decision = photoDecision("PUBLISHED", null, true);
    assert.equal(decision.status, "DRAFT");
    assert.equal(decision.heldBack, true);
    assert.match(decision.message, /credit/i);
  });

  it("does not treat whitespace as a credit", () => {
    // " " is truthy. A credit that says nothing is not a credit.
    assert.equal(photoDecision("PUBLISHED", "   ", true).status, "DRAFT");
  });

  it("publishes once there is one", () => {
    const decision = photoDecision("PUBLISHED", "Photo: R. Weiss", false);
    assert.equal(decision.status, "PUBLISHED");
    assert.equal(decision.heldBack, false);
    assert.equal(decision.message, "Picture updated.");
  });

  it("keeps a draft a draft, credited or not", () => {
    // Saving a draft is not a failed publish, so it must not say it was held back.
    assert.deepEqual(photoDecision("DRAFT", null, true), {
      status: "DRAFT",
      message: "Picture added.",
      heldBack: false,
    });
    assert.equal(photoDecision("DRAFT", "Someone", true).status, "DRAFT");
  });

  it("treats anything unrecognised as a draft", () => {
    // The status comes off a form and a form can be posted by hand. The safe
    // direction for a value nobody chose is off the site, not on it.
    assert.equal(photoDecision("", null, true).status, "DRAFT");
    assert.equal(photoDecision("published", "Someone", true).status, "DRAFT");
  });
});

describe("what a picture can be of", () => {
  it("accepts the three levels and nothing else", () => {
    for (const kind of ["destination", "cemetery", "place"]) assert.ok(isPhotoOwnerKind(kind));
    for (const kind of ["", "user", "provider", "DESTINATION"]) assert.ok(!isPhotoOwnerKind(kind));
  });
});

describe("which pages a new picture changes", () => {
  it("refreshes the beis hachaim, not the town of the same name", () => {
    // A cemetery slug and a destination slug can collide (uman, krakow). Sending
    // a kever picture to revalidate /uman would refresh the one page it cannot
    // appear on and leave the one it does appear on stale.
    const paths = pathsToRefresh("cemetery", "lizhensk");
    assert.deepEqual(paths, ["/cemeteries/lizhensk", "/cemeteries", "/admin/kevarim"]);
    assert.ok(!paths.includes("/lizhensk"));
  });

  it("refreshes a listing's picture through its town, because that is where it shows", () => {
    assert.deepEqual(pathsToRefresh("place", "krakow"), ["/krakow", "/heritage/towns/krakow", "/admin/destinations"]);
  });

  it("treats a town the same way", () => {
    assert.deepEqual(pathsToRefresh("destination", "krakow"), pathsToRefresh("place", "krakow"));
  });
});
