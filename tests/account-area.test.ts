import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { initialsFor } from "@/components/AvatarCircle";
import { setAccountAvatar } from "@/lib/account-store";

// The account page is the small, clear version the owner asked for: exactly
// five areas — Itineraries, Route, Favorites, Details, Sign out — and a
// profile picture whose one public appearance is beside a published review.

const PAGE = readFileSync("app/account/page.tsx", "utf8");
const PANEL = readFileSync("components/AccountRoutePanel.tsx", "utf8");
const SETTINGS = readFileSync("components/AccountSettings.tsx", "utf8");
const AVATAR = readFileSync("components/AvatarCircle.tsx", "utf8");
const ROUTE = readFileSync("app/api/account/avatar/route.ts", "utf8");
const BAR = readFileSync("components/MobileBottomBar.tsx", "utf8");
const NAVBAR = readFileSync("components/Navbar.tsx", "utf8");

// Comments stripped before a negative assertion: a file is allowed to explain
// in prose why Favorites is absent without defeating the check about it.
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the account page", () => {
  it("offers exactly the five areas — Itineraries, Route, Favorites, Details, Sign out", () => {
    // The first three live in the panel the page mounts; the last two are the
    // page's own.
    assert.match(PAGE, /<AccountRoutePanel \/>/);
    for (const title of ["Itineraries", "Route", "Favorites"]) {
      assert.match(PANEL, new RegExp(`title="${title}"`), `${title} section missing`);
    }
    assert.match(PAGE, />Details<\/h2>/);
    assert.match(PAGE, />Sign out<\/h2>/);
  });

  it("sends a signed-out visitor to sign in, through the same door as the header", () => {
    assert.match(PAGE, /if \(!signedIn\) redirect\("\/login\?next=/);
  });
});

describe("favorites lives in the account, nowhere in the chrome", () => {
  it("stays out of the mobile bottom bar", () => {
    assert.doesNotMatch(strip(BAR), /favorite/i, "Favorites belongs inside Account, not the bottom bar");
  });

  it("stays out of the header icons", () => {
    assert.doesNotMatch(strip(NAVBAR), /favorite/i, "Favorites belongs inside Account, not the header");
  });

  it("renders saved favorites in their own section on the account page", () => {
    assert.match(PANEL, /id="account-favorites"/);
    // Fed from the account itself, not from browser storage.
    assert.match(PANEL, /\/api\/account\/me/);
  });
});

describe("the profile picture API", () => {
  it("refuses a signed-out request before reading anything else", () => {
    assert.match(ROUTE, /readSessionEmail/);
    assert.match(ROUTE, /status: 401/);
    // The sign-in check comes before the upload is even parsed.
    assert.ok(ROUTE.indexOf("status: 401") < ROUTE.indexOf("putMedia("), "401 must be decided before any write");
  });

  it("refuses a request from another site, on upload and on removal alike", () => {
    assert.match(ROUTE, /sameOrigin\(request\)/);
    assert.match(ROUTE, /status: 403/);
    const guarded = ROUTE.split("sameOrigin(request)").length - 1;
    assert.ok(guarded >= 2, "both POST and DELETE must check the origin");
  });

  it("accepts only JPG, PNG or WEBP — never the media store's PDFs or GIFs", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      assert.match(ROUTE, new RegExp(`"${type}"`), `${type} missing from the allowlist`);
    }
    assert.doesNotMatch(strip(ROUTE), /gif|pdf/i);
  });

  it("refuses an oversized picture with the store's real limit, not a failed save", () => {
    // lib/media caps a single value below the 2 MB the page allows, so the
    // smaller number is the one enforced and the one said out loud.
    assert.match(ROUTE, /Math\.min\(MAX_AVATAR_BYTES, MAX_MEDIA_BYTES\)/);
    assert.match(ROUTE, /status: 413/);
  });

  it("stores through lib/media and serves through the existing /api/media route only", () => {
    assert.match(ROUTE, /putMedia\(/);
    assert.match(ROUTE, /setAccountAvatar\(email, id\)/);
    assert.match(ROUTE, /\/api\/media\?id=/);
    // No new serving path: the route uploads and removes, it never serves.
    assert.doesNotMatch(ROUTE, /export async function GET/);
  });

  it("takes the picture down on DELETE", () => {
    assert.match(ROUTE, /setAccountAvatar\(email, null\)/);
  });
});

describe("the avatar record on the account", () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    if (url !== undefined) process.env.UPSTASH_REDIS_REST_URL = url;
    if (token !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = token;
  });

  it("saves nothing when the private database is not connected", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const result = await setAccountAvatar("someone@example.com", "m-123");
    assert.equal(result.ok, false);
  });
});

describe("the avatar circle", () => {
  it("takes the first letters of the first and last word, uppercased", () => {
    assert.equal(initialsFor("Rivka Neuman"), "RN");
    assert.equal(initialsFor("sara rivka bas miriam"), "SM");
    assert.equal(initialsFor("  Moshe  "), "M");
  });

  it("shows a question mark when there is no name to cut letters from", () => {
    assert.equal(initialsFor(""), "?");
    assert.equal(initialsFor("   "), "?");
    assert.equal(initialsFor(undefined), "?");
  });

  it("names itself for a screen reader", () => {
    assert.match(AVATAR, /role="img"/);
    assert.match(AVATAR, /aria-label/);
    assert.match(AVATAR, /"Profile picture"/);
  });
});

describe("what the picture is for", () => {
  it("says plainly it appears beside published reviews and nowhere else", () => {
    assert.match(SETTINGS, /beside reviews you publish/);
    assert.match(SETTINGS, /Nowhere else/);
  });
});
