import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { edgeSiteAccessValid } from "@/lib/edge-lock";
import { checkSiteAccess, mintSiteAccess, PREVIEW_MINUTES } from "@/lib/site-access";

// Two things are being held in place here.
//
// The five-minute code has to actually stop working. A short cookie lifetime
// is not enough — a browser's expiry is only a suggestion, and anyone who
// copies the cookie value keeps it. So the expiry is signed in and checked on
// every request, and these tests are what say so.
//
// And the middleware checks it a second time with WebCrypto, because it runs on
// the edge and cannot use node's crypto. If those two ever disagree, either the
// five minutes last forever or somebody is thrown out mid-visit.

describe("the two site codes", () => {
  before(() => {
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  });
  after(() => {
    delete process.env.WHITE_GLOVE_SESSION_SECRET;
  });

  it("lets the full code in and keeps it in", async () => {
    const cookie = mintSiteAccess(0)!;
    assert.equal(checkSiteAccess(cookie, 0).ok, true);
    assert.equal(await edgeSiteAccessValid(cookie, 0), true);
  });

  it("lets the five-minute code in while it is fresh", async () => {
    const cookie = mintSiteAccess(0, PREVIEW_MINUTES)!;
    assert.equal(checkSiteAccess(cookie, 0).ok, true);
    assert.equal(await edgeSiteAccessValid(cookie, 0), true);
  });

  it("shuts the five-minute code out once the time is up", async () => {
    // Minted a minute in the past, so it is already spent.
    const cookie = mintSiteAccess(0, -1)!;
    const check = checkSiteAccess(cookie, 0);
    assert.equal(check.ok, false);
    assert.equal(check.expired, true);
    assert.equal(await edgeSiteAccessValid(cookie, 0), false);
  });

  it("will not let the expiry be edited", async () => {
    const cookie = mintSiteAccess(0, -1)!;
    const [, generation, signature] = cookie.split(".");
    const forged = `${Date.now() + 60_000}.${generation}.${signature}`;
    assert.equal(checkSiteAccess(forged, 0).ok, false);
    assert.equal(await edgeSiteAccessValid(forged, 0), false);
  });
});

describe("signing everybody out", () => {
  before(() => {
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  });
  after(() => {
    delete process.env.WHITE_GLOVE_SESSION_SECRET;
  });

  it("stops a cookie from the round before", async () => {
    const cookie = mintSiteAccess(3)!;
    assert.equal(checkSiteAccess(cookie, 3).ok, true);
    // The owner revokes: the generation moves on and the cookie is dead.
    assert.equal(checkSiteAccess(cookie, 4).ok, false);
    assert.equal(await edgeSiteAccessValid(cookie, 4), false);
  });

  it("will not let the generation be edited either", async () => {
    const cookie = mintSiteAccess(3)!;
    const [expires, , signature] = cookie.split(".");
    assert.equal(checkSiteAccess(`${expires}.4.${signature}`, 4).ok, false);
    assert.equal(await edgeSiteAccessValid(`${expires}.4.${signature}`, 4), false);
  });
});

describe("people already signed in", () => {
  before(() => {
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  });
  after(() => {
    delete process.env.WHITE_GLOVE_SESSION_SECRET;
  });

  it("keeps the old bare cookie working until the first revoke", async () => {
    // What cookies looked like before expiries existed. Nobody should be
    // signed out just because this shipped.
    const { accessToken } = await import("@/lib/secure-access");
    const legacy = accessToken("site")!;
    assert.equal(checkSiteAccess(legacy, 0, legacy).ok, true);
    assert.equal(await edgeSiteAccessValid(legacy, 0), true);
  });

  it("ends the old cookie at the first revoke", async () => {
    const { accessToken } = await import("@/lib/secure-access");
    const legacy = accessToken("site")!;
    assert.equal(checkSiteAccess(legacy, 1, legacy).ok, false);
    assert.equal(await edgeSiteAccessValid(legacy, 1), false);
  });
});

describe("nonsense in the cookie", () => {
  for (const value of ["", "garbage", "a.b.c", "0.0", "0.0.", "...."]) {
    it(`refuses ${JSON.stringify(value)}`, async () => {
      assert.equal(checkSiteAccess(value, 0).ok, false);
      assert.equal(await edgeSiteAccessValid(value, 0), false);
    });
  }
});
