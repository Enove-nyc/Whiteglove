import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EMPTY_ABOUT_PROFILE } from "@/data/about-profile";
import { caseStudyCompleteness, caseStudyIsPublic, type CaseStudy } from "@/data/case-studies";
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
    tripRequest: "Four days in Rome with Shabbos walked.",
    whatSolved: "Quarter, meals, and a day plan.",
    outcome: "They kept kosher without scrambling on erev Shabbos.",
    permissionRecorded: true,
    approved: true,
    approvedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("is not public until complete, permitted and approved", () => {
    assert.equal(caseStudyIsPublic(base), true);
    assert.equal(caseStudyIsPublic({ ...base, approved: false }), false);
    assert.equal(caseStudyIsPublic({ ...base, permissionRecorded: false }), false);
    assert.ok(caseStudyCompleteness({ ...base, outcome: "" }));
  });

  it("ships with no seed testimonials", () => {
    const store = readFileSync("lib/case-studies-store.ts", "utf8");
    assert.doesNotMatch(store, /Lorem|sample testimonial|fake review/i);
    assert.match(readFileSync("components/CaseStudiesSection.tsx", "utf8"), /studies\.length === 0\) return null/);
  });
});
