import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EMPTY_ABOUT_PROFILE } from "@/data/about-profile";
import {
  caseStudiesPageShouldExist,
  caseStudyCompleteness,
  caseStudyIsPublic,
  MIN_CASE_STUDIES_FOR_PAGE,
  sortCaseStudiesForPublic,
  type CaseStudy,
} from "@/data/case-studies";
import {
  aboutProfileHasPublicContent,
  aboutProfileProblem,
  isSafeAboutPhotoUrl,
  mergeAboutProfile,
} from "@/lib/about-profile";

describe("about profile", () => {
  it("hides everything when empty and keeps the fallback for the page", () => {
    assert.equal(aboutProfileHasPublicContent(EMPTY_ABOUT_PROFILE), false);
    assert.equal(aboutProfileHasPublicContent(mergeAboutProfile({})), false);
  });

  it("refuses a photo without alt text", () => {
    assert.match(
      String(aboutProfileProblem({ ...EMPTY_ABOUT_PROFILE, photoUrl: "/api/media?id=m-abc", photoAlt: "" })),
      /alt text/i,
    );
  });

  it("only accepts same-origin media URLs", () => {
    assert.equal(isSafeAboutPhotoUrl("/api/media?id=m-abc123"), true);
    assert.equal(isSafeAboutPhotoUrl("https://evil.example/x.jpg"), false);
    assert.equal(isSafeAboutPhotoUrl("javascript:alert(1)"), false);
  });

  it("admin and public surfaces exist", () => {
    assert.match(readFileSync("app/admin/settings/about/page.tsx", "utf8"), /AboutProfileForm/);
    assert.match(readFileSync("app/about/page.tsx", "utf8"), /AboutProfileSection/);
    assert.match(readFileSync("app/about/page.tsx", "utf8"), /CaseStudiesSection/);
  });
});

describe("case studies / social proof", () => {
  const base: CaseStudy = {
    id: "cs-1",
    attribution: "A family from London",
    anonymised: true,
    location: "Rome",
    tripType: "Family city break",
    quote: "We kept Shabbos without scrambling.",
    tripRequest: "Four days in Rome with Shabbos walked.",
    whatSolved: "Quarter, meals, and a day plan.",
    outcome: "They kept kosher without scrambling on erev Shabbos.",
    itineraryHref: "/destinations/rome",
    permissionRecorded: true,
    approved: true,
    approvedAt: "2026-08-01T00:00:00.000Z",
    sortOrder: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("is not public until complete, permitted and approved", () => {
    assert.equal(caseStudyIsPublic(base), true);
    assert.equal(caseStudyIsPublic({ ...base, approved: false }), false);
    assert.equal(caseStudyIsPublic({ ...base, permissionRecorded: false }), false);
    assert.ok(caseStudyCompleteness({ ...base, outcome: "" }));
  });

  it("treats withdrawn permission as not public even if approved was left on", () => {
    // Store also clears approved on save; the public gate must not rely on that alone.
    assert.equal(caseStudyIsPublic({ ...base, permissionRecorded: false, approved: true }), false);
  });

  it("refuses an off-site itinerary link", () => {
    assert.match(String(caseStudyCompleteness({ ...base, itineraryHref: "https://evil.example" })), /path on this site/i);
  });

  it("ships with no seed testimonials", () => {
    const store = readFileSync("lib/case-studies-store.ts", "utf8");
    assert.doesNotMatch(store, /Lorem|sample testimonial|fake review/i);
    assert.match(readFileSync("components/CaseStudiesSection.tsx", "utf8"), /studies\.length === 0\) return null/);
  });

  it("homepage and about only render the section when studies exist", () => {
    assert.match(readFileSync("app/page.tsx", "utf8"), /CaseStudiesSection/);
    assert.match(readFileSync("app/page.tsx", "utf8"), /readPublicCaseStudies/);
    assert.match(readFileSync("app/about/page.tsx", "utf8"), /readPublicCaseStudies/);
  });

  it("dedicated page exists only when enough approved content is present", () => {
    assert.equal(MIN_CASE_STUDIES_FOR_PAGE, 2);
    assert.equal(caseStudiesPageShouldExist([]), false);
    assert.equal(caseStudiesPageShouldExist([base]), false);
    assert.equal(caseStudiesPageShouldExist([base, { ...base, id: "cs-2" }]), true);
    const page = readFileSync("app/case-studies/page.tsx", "utf8");
    assert.match(page, /notFound\(\)/);
    assert.match(page, /caseStudiesPageShouldExist/);
  });

  it("distinguishes genuine case studies from the sample itinerary", () => {
    const section = readFileSync("components/CaseStudiesSection.tsx", "utf8");
    assert.match(section, /sample itinerary/i);
    assert.match(readFileSync("app/admin/settings/proof/page.tsx", "utf8"), /sample itinerary/i);
  });

  it("supports ordering for public display", () => {
    const ordered = sortCaseStudiesForPublic([
      { ...base, id: "b", sortOrder: 2 },
      { ...base, id: "a", sortOrder: 0 },
    ]);
    assert.deepEqual(
      ordered.map((s) => s.id),
      ["a", "b"],
    );
  });

  it("admin can publish, unpublish, reorder and delete", () => {
    const actions = readFileSync("app/admin/settings/proof/actions.ts", "utf8");
    assert.match(actions, /publishCaseStudyAction/);
    assert.match(actions, /unpublishCaseStudyAction/);
    assert.match(actions, /reorderCaseStudyAction/);
    assert.match(actions, /deleteCaseStudyAction/);
    const form = readFileSync("components/CaseStudiesForm.tsx", "utf8");
    assert.match(form, /Unpublish/);
    assert.match(form, /Move up/);
  });
});
