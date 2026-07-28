import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createAccountSession, parseAccountSession } from "@/lib/account-session";
import { edgeAccountEmail } from "@/lib/edge-lock";

// The middleware runs on the edge and cannot use node's crypto, so it verifies
// the account cookie a second time with WebCrypto. If the two ever disagree,
// people the owner let in are silently shut out — or worse, someone gets in who
// should not. These pin them together.

describe("the edge and node account sessions agree", () => {
  before(() => {
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  });
  after(() => {
    delete process.env.WHITE_GLOVE_SESSION_SECRET;
  });

  const emails = [
    "owner@whitegloveitineraries.com",
    "Someone.With.Dots@gmail.com",
    "UPPER@EXAMPLE.ORG",
    "plus+tag@example.co.uk",
  ];

  for (const email of emails) {
    it(`accepts a real cookie for ${email}`, async () => {
      const cookie = createAccountSession(email);
      assert.equal(parseAccountSession(cookie), email.trim().toLowerCase());
      assert.equal(await edgeAccountEmail(cookie), email.trim().toLowerCase());
    });
  }

  it("refuses a tampered signature", async () => {
    const cookie = createAccountSession("owner@example.com");
    const tampered = `${cookie.slice(0, -1)}${cookie.at(-1) === "A" ? "B" : "A"}`;
    assert.equal(parseAccountSession(tampered), null);
    assert.equal(await edgeAccountEmail(tampered), null);
  });

  it("refuses a cookie for a different email", async () => {
    const cookie = createAccountSession("owner@example.com");
    const swapped = `${encodeURIComponent("attacker@example.com")}.${cookie.split(".").pop()}`;
    assert.equal(parseAccountSession(swapped), null);
    assert.equal(await edgeAccountEmail(swapped), null);
  });

  it("refuses nonsense", async () => {
    for (const value of ["", "no-dot", ".", "..", "a.b.c"]) {
      assert.equal(await edgeAccountEmail(value), null, `edge accepted ${JSON.stringify(value)}`);
    }
  });

  it("refuses a cookie signed with a different secret", async () => {
    const cookie = createAccountSession("owner@example.com");
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-completely-different-secret-value";
    assert.equal(parseAccountSession(cookie), null);
    assert.equal(await edgeAccountEmail(cookie), null);
    process.env.WHITE_GLOVE_SESSION_SECRET = "a-test-secret-that-is-long-enough";
  });
});

describe("the owner can never be locked out", () => {
  it("the owner holds both grants without any stored record", async () => {
    process.env.OWNER_EMAIL = "owner@whitegloveitineraries.com";
    // Import after the variable is set — the module reads it per call, but this
    // keeps the intent obvious.
    const { isAdminAccount, hasSiteAccess, ownerEmail } = await import("@/lib/admin-roles");
    assert.equal(ownerEmail(), "owner@whitegloveitineraries.com");
    assert.equal(await isAdminAccount("Owner@WhiteGloveItineraries.com"), true);
    assert.equal(await hasSiteAccess("owner@whitegloveitineraries.com"), true);
    delete process.env.OWNER_EMAIL;
  });

  it("refuses to remove the owner", async () => {
    process.env.OWNER_EMAIL = "owner@whitegloveitineraries.com";
    const { removeTeamMember, saveTeamMember } = await import("@/lib/admin-roles");
    const removed = await removeTeamMember("OWNER@whitegloveitineraries.com");
    assert.equal(removed.ok, false);
    const saved = await saveTeamMember({ email: "owner@whitegloveitineraries.com", admin: false, siteAccess: false });
    assert.equal(saved.ok, false, "the owner's own grants must not be editable here");
    delete process.env.OWNER_EMAIL;
  });

  it("nobody else is an admin by default", async () => {
    const { isAdminAccount, hasSiteAccess } = await import("@/lib/admin-roles");
    assert.equal(await isAdminAccount("stranger@example.com"), false);
    assert.equal(await hasSiteAccess("stranger@example.com"), false);
    assert.equal(await isAdminAccount(null), false);
    assert.equal(await hasSiteAccess(undefined), false);
  });
});
