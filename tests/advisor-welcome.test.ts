import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { captionProblem, isWelcomeVideoType, MAX_WELCOME_CAPTION } from "@/data/advisor-welcome";

describe("what counts as a welcome video type", () => {
  it("accepts mp4, mov and webm", () => {
    assert.equal(isWelcomeVideoType("video/mp4"), true);
    assert.equal(isWelcomeVideoType("video/quicktime"), true);
    assert.equal(isWelcomeVideoType("video/webm"), true);
  });

  it("rejects anything else", () => {
    assert.equal(isWelcomeVideoType("image/png"), false);
    assert.equal(isWelcomeVideoType("video/avi"), false);
  });
});

describe("a welcome video's caption", () => {
  it("is fine when absent", () => {
    assert.equal(captionProblem(undefined), null);
  });

  it("is fine under the limit", () => {
    assert.equal(captionProblem("Looking forward to Rome!"), null);
  });

  it("is refused over the limit", () => {
    assert.match(captionProblem("x".repeat(MAX_WELCOME_CAPTION + 1)) ?? "", /caption/);
  });
});

describe("the welcome video is Business-only, the same door as the proposal it's on", () => {
  const ROUTE = readFileSync("app/api/account/welcome-video/route.ts", "utf8");

  it("the upload route is gated on mayServeCompanionClients", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /mayServeCompanionClients/);
  });

  it("the remove route is gated the same way", () => {
    const del = ROUTE.slice(ROUTE.indexOf("export async function DELETE"));
    assert.match(del, /mayServeCompanionClients/);
  });

  it("both resolve the signed-in identity through resolveBusinessOwner", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });

  it("checks same-origin before uploading or removing anything", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    const del = ROUTE.slice(ROUTE.indexOf("export async function DELETE"));
    assert.match(post, /sameOrigin/);
    assert.match(del, /sameOrigin/);
  });
});

describe("the public proposal page shows the welcome video without an account", () => {
  const PAGE = readFileSync("app/p/[shareId]/page.tsx", "utf8");

  it("reads advisorWelcome from the shared proposal", () => {
    assert.match(PAGE, /advisorWelcome/);
  });
});
