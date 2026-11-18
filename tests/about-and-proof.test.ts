import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EMPTY_ABOUT_PROFILE } from "@/data/about-profile";
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
  });
});
