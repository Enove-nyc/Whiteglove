import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * whitegloveitineraries.com without the www goes to www. Netlify did this for
 * us; Cloudflare does not, so the middleware does (18 November 2026).
 */
describe("the bare domain", () => {
  const mw = readFileSync("middleware.ts", "utf8");
  it("is sent to www, permanently, keeping the path", () => {
    assert.match(mw, /if \(isBareItinerariesHost\(request\.headers\)\)/);
    assert.match(mw, /"https:\/\/www\.whitegloveitineraries\.com"/);
    assert.match(mw, /NextResponse\.redirect\(to, 308\)/);
  });
  it("comes after the kosher closing page and before anything else", () => {
    const closure = mw.indexOf("isClosedKosherHost(request.headers)");
    const bare = mw.indexOf("if (isBareItinerariesHost(request.headers))");
    const directory = mw.indexOf("isDirectoryApi(pathname) && !(await isOwner");
    assert.ok(closure > 0 && bare > closure && directory > bare);
  });
});
