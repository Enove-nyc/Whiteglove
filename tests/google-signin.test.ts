import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeUrl,
  callbackUrl,
  claimsFromIdToken,
  describeProblem,
  googleConfig,
  identityFrom,
  type IdTokenClaims,
} from "@/lib/google-signin";

/**
 * Signing in with Google.
 *
 * The owner's decision: Google lands on THE SAME ACCOUNT as the password, so
 * whoever proves they hold an email address gets the account behind it. Every
 * test below is about the proof being real — and the one that matters most is
 * `email_verified`, because without it this is a way to take somebody's
 * account rather than a way into your own.
 */

const CLIENT = "123.apps.googleusercontent.com";
const NONCE = "nonce-abc";
const NOW = Date.UTC(2026, 7, 2);

const claims = (over: Partial<IdTokenClaims> = {}): IdTokenClaims => ({
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: Math.floor(NOW / 1000) + 600,
  nonce: NONCE,
  email: "Yaakov@Example.com",
  email_verified: true,
  name: "Yaakov Cohen",
  sub: "google-user-1",
  ...over,
});

const check = (over: Partial<IdTokenClaims> = {}) => identityFrom(claims(over), { clientId: CLIENT, nonce: NONCE, now: NOW });

describe("switched off unless both keys are set", () => {
  it("needs both halves", () => {
    // A half-configured button sends somebody to a Google error page, which is
    // worse than no button.
    assert.equal(googleConfig({ GOOGLE_CLIENT_ID: CLIENT }), null);
    assert.equal(googleConfig({ GOOGLE_CLIENT_SECRET: "s" }), null);
    assert.equal(googleConfig({}), null);
    assert.deepEqual(googleConfig({ GOOGLE_CLIENT_ID: CLIENT, GOOGLE_CLIENT_SECRET: "s" }), { clientId: CLIENT, clientSecret: "s" });
  });

  it("treats whitespace as not set", () => {
    assert.equal(googleConfig({ GOOGLE_CLIENT_ID: "  ", GOOGLE_CLIENT_SECRET: "s" }), null);
  });
});

describe("where Google is asked to send people back", () => {
  it("is one exact address, with no trailing slash", () => {
    // Has to match the console entry character for character, or Google
    // refuses with an error the visitor can do nothing about.
    assert.equal(callbackUrl("https://whiteglovekoshertravel.com"), "https://whiteglovekoshertravel.com/api/account/google/callback");
    assert.equal(callbackUrl("https://whiteglovekoshertravel.com/"), "https://whiteglovekoshertravel.com/api/account/google/callback");
  });
});

describe("what is asked of Google", () => {
  const url = new URL(
    authorizeUrl({ clientId: CLIENT, redirectUri: "https://x.test/api/account/google/callback", state: "st", codeChallenge: "ch", nonce: NONCE }),
  );

  it("asks for the address and the name, and nothing else", () => {
    // This site has no business asking for somebody's calendar to let them
    // save a kever.
    assert.equal(url.searchParams.get("scope"), "openid email profile");
  });

  it("carries the one-time values that make the reply checkable", () => {
    assert.equal(url.searchParams.get("state"), "st");
    assert.equal(url.searchParams.get("nonce"), NONCE);
    assert.equal(url.searchParams.get("code_challenge"), "ch");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("response_type"), "code");
  });

  it("does not ask for offline access", () => {
    // Nothing here works while the person is away, so a refresh token would be
    // a long-lived credential kept for no reason.
    assert.equal(url.searchParams.get("access_type"), null);
  });
});

describe("who came back", () => {
  it("takes a proper reply, and settles on one spelling of the address", () => {
    const result = check();
    assert.ok(result.ok, result.ok ? "" : result.reason);
    assert.equal(result.identity.email, "yaakov@example.com");
    assert.equal(result.identity.name, "Yaakov Cohen");
  });

  it("REFUSES AN UNVERIFIED ADDRESS, and says what to do instead", () => {
    // THE ONE THAT MATTERS. Linking by email means whoever proves they hold an
    // address gets the account behind it — so the proof has to be real. A
    // Workspace account on a custom domain can carry an address nobody
    // confirmed; accepting one would hand a stranger somebody else's saved
    // trips and boarding passes, and it would look like an ordinary sign-in.
    const refused = check({ email_verified: false });
    assert.equal(refused.ok, false);
    assert.match(String(!refused.ok && refused.reason), /has not verified/);
    assert.match(String(!refused.ok && refused.reason), /password instead/);

    // Absent is not "yes" either.
    assert.equal(check({ email_verified: undefined }).ok, false);
  });

  it("accepts the string Google sometimes sends instead of a boolean", () => {
    assert.equal(check({ email_verified: "true" }).ok, true);
    assert.equal(check({ email_verified: "false" }).ok, false);
  });

  it("refuses a token issued for a different website", () => {
    // A genuine Google token, correctly signed, for somebody else's app —
    // replayed here. The signature would pass; the audience is what catches it.
    const refused = check({ aud: "999.apps.googleusercontent.com" });
    assert.equal(refused.ok, false);
    assert.match(String(!refused.ok && refused.reason), /different website/);
  });

  it("accepts a token whose audience list includes us", () => {
    assert.equal(check({ aud: ["other", CLIENT] }).ok, true);
  });

  it("refuses one that did not come from Google", () => {
    assert.equal(check({ iss: "https://accounts.example.com" }).ok, false);
    assert.equal(check({ iss: undefined }).ok, false);
  });

  it("takes Google's issuer either way it spells it", () => {
    assert.equal(check({ iss: "accounts.google.com" }).ok, true);
  });

  it("refuses an expired one", () => {
    assert.equal(check({ exp: Math.floor(NOW / 1000) - 1 }).ok, false);
  });

  it("refuses one that answers a different attempt", () => {
    // The nonce ties the reply to the sign-in this browser actually started.
    assert.equal(check({ nonce: "someone-elses" }).ok, false);
    assert.equal(check({ nonce: undefined }).ok, false);
  });

  it("refuses one with no address at all, because there is nothing to sign in to", () => {
    assert.equal(check({ email: undefined }).ok, false);
  });

  it("refuses a reply that could not be read", () => {
    assert.equal(identityFrom(null, { clientId: CLIENT, nonce: NONCE, now: NOW }).ok, false);
    assert.equal(claimsFromIdToken("not-a-token"), null);
    assert.equal(claimsFromIdToken("a.b"), null);
  });

  it("reads the middle of a real-shaped token", () => {
    const body = Buffer.from(JSON.stringify({ email: "a@b.com" })).toString("base64url");
    assert.equal(claimsFromIdToken(`head.${body}.sig`)?.email, "a@b.com");
  });
});

describe("what the visitor is told", () => {
  it("says something a person can act on, never a code", () => {
    for (const code of ["cancelled", "state", "exchange", "unavailable", "storage"]) {
      const said = String(describeProblem(code));
      assert.ok(said.length > 15, code);
      assert.ok(!said.includes("_"), `${code} shows a machine word: ${said}`);
    }
  });

  it("says something for a code it has never seen", () => {
    assert.match(String(describeProblem("something-new")), /did not complete/);
  });

  it("says nothing when nothing went wrong", () => {
    assert.equal(describeProblem(null), null);
    assert.equal(describeProblem(undefined), null);
  });
});
