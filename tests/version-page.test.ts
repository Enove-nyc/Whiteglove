import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * What /version may say, and to whom.
 *
 * Railway health-checks this route, so a customer can reach it directly and it
 * must never read like a broken page or leak anything. But the commit is the
 * only way to answer "did that deploy land?", and without it the honest
 * failure is watching a stale page and concluding the code is broken. Both
 * needs are real; the admin cookie is what separates them.
 */
const source = readFileSync("app/version/page.tsx", "utf8");

describe("the deployment health check", () => {
  it("says something calm and complete to a customer", () => {
    assert.match(source, /White Glove is available/);
    assert.match(source, /robots: \{ index: false, follow: false \}/);
    // Dynamic, or it would answer with whatever was true at build time.
    assert.match(source, /export const dynamic = "force-dynamic"/);
  });

  it("SHOWS THE COMMIT ONLY TO A SIGNED-IN ADMIN", () => {
    assert.match(source, /isValidAccessToken\("admin"/);
    // The sha must be inside the admin branch, never rendered unconditionally.
    const adminBlock = source.split("{admin ? (")[1] ?? "";
    assert.match(adminBlock, /\{sha\}/, "the commit is not behind the admin check");
    const beforeBlock = source.split("{admin ? (")[0];
    assert.doesNotMatch(beforeBlock, /\{sha\}|\{message\}|\{branch\}/, "build details render before the check");
  });

  it("reads whichever platform built it, so the answer survives a move", () => {
    assert.match(source, /VERCEL_GIT_COMMIT_SHA/);
    assert.match(source, /RAILWAY_GIT_COMMIT_SHA/);
  });
});
