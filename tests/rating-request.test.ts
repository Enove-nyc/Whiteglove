import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("sending a post-trip rating request is Business-only", () => {
  const ROUTE = readFileSync("app/api/account/rating-request/route.ts", "utf8");

  it("is gated on mayServeCompanionClients", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("resolves the signed-in identity through resolveBusinessOwner", () => {
    assert.match(ROUTE, /resolveBusinessOwner/);
  });

  it("checks same-origin before sending anything", () => {
    assert.match(ROUTE, /sameOrigin/);
    assert.ok(ROUTE.indexOf("sameOrigin") < ROUTE.indexOf("sendRatingRequestEmail("));
  });

  it("only marks the request sent after the email actually succeeds", () => {
    const sendAt = ROUTE.indexOf("sendRatingRequestEmail(");
    const markAt = ROUTE.indexOf("markRatingRequestSent(");
    assert.ok(sendAt > 0 && markAt > sendAt);
  });

  it("rejects a request with no valid client email", () => {
    assert.match(ROUTE, /EMAIL\.test\(clientEmail\)/);
  });

  it("is rate limited per account, the same fence app/api/account/itinerary/send/route.ts keeps on the same shape of request", () => {
    assert.match(ROUTE, /rateLimit\(`rating-request:\$\{owner\}`, SEND_LIMIT\)/);
  });

  it("builds its one link from siteOrigin(), never trusting the request's own Host header alone", () => {
    assert.match(ROUTE, /siteOrigin\(\)\?\.origin \|\| request\.nextUrl\.origin/);
  });
});
