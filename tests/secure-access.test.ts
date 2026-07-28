import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { accessConfigured, accessToken, isValidAccessToken, sameOrigin } from "@/lib/secure-access";

// The admin cookie is the only thing between the internet and every visitor's
// name, email and phone number. These cover the two ways it could go wrong:
// a token anybody can compute, and a request from somewhere else being trusted.

const ORIGINAL_ENV = process.env.NODE_ENV;

afterEach(() => {
  delete process.env.WHITE_GLOVE_SESSION_SECRET;
  delete process.env.ADMIN_PASSWORD;
  Object.defineProperty(process.env, "NODE_ENV", {
    value: ORIGINAL_ENV,
    configurable: true,
    writable: true,
    enumerable: true,
  });
});

function setProduction() {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "production",
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

describe("a deployment with no secret cannot be signed into at all", () => {
  it("mints no token in production when nothing is configured", () => {
    setProduction();
    assert.equal(accessConfigured(), false);
    assert.equal(accessToken("admin"), null);
  });

  it("validates nothing in that state — including the old built-in secret", () => {
    setProduction();
    // What the constant used to produce. Anyone could compute this from the
    // source, so it must not be accepted.
    const forged = "2Zx1n8oTvUqk0m5AqLc0m9Q1v0Qy2b3c4d5e6f7g8h9";
    assert.equal(isValidAccessToken("admin", forged), false);
    assert.equal(isValidAccessToken("admin", ""), false);
    assert.equal(isValidAccessToken("site", forged), false);
  });

  it("works normally once a secret is set", () => {
    setProduction();
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-real-secret-for-this-deployment";
    const token = accessToken("admin");
    assert.ok(token);
    assert.equal(isValidAccessToken("admin", token), true);
    assert.equal(isValidAccessToken("site", token), false, "an admin token must not open the site scope");
  });

  it("a different secret invalidates an old token", () => {
    setProduction();
    process.env.WHITE_GLOVE_SESSION_SECRET = "first-secret-value-here";
    const token = accessToken("admin")!;
    process.env.WHITE_GLOVE_SESSION_SECRET = "second-secret-value-here";
    assert.equal(isValidAccessToken("admin", token), false);
  });
});

describe("requests from another site are refused", () => {
  const req = (headers: Record<string, string>) => ({
    headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
  });

  it("allows a same-origin request", () => {
    assert.equal(sameOrigin(req({ origin: "https://admin.example.com", host: "admin.example.com" })), true);
  });

  it("refuses a cross-origin request", () => {
    assert.equal(sameOrigin(req({ origin: "https://evil.example", host: "admin.example.com" })), false);
  });

  it("refuses a look-alike origin", () => {
    assert.equal(sameOrigin(req({ origin: "https://admin.example.com.evil.test", host: "admin.example.com" })), false);
  });

  it("allows a request with no Origin — a form post or a server call", () => {
    assert.equal(sameOrigin(req({ host: "admin.example.com" })), true);
  });

  it("honours the forwarded host a proxy sets", () => {
    assert.equal(
      sameOrigin(req({ origin: "https://admin.example.com", host: "internal:3000", "x-forwarded-host": "admin.example.com" })),
      true,
    );
  });

  it("refuses a malformed origin", () => {
    assert.equal(sameOrigin(req({ origin: "not a url", host: "admin.example.com" })), false);
  });
});
