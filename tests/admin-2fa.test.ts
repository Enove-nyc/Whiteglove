import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { generateRecoveryCodes, SHARED_DOOR, twoFactorKeyFor } from "@/lib/admin-2fa-store";

/**
 * The second factor on the admin.
 *
 * Behind either admin door is the money, every visitor's email and phone
 * number, every shomer's number, and the switch that closes the site — and
 * until now each door was one secret. The shared password is the worse of the
 * two: handed out over years, never taken back, with no account behind it to
 * disable. A code does not fix that, but it does mean a copy somebody still
 * has from a year ago no longer opens anything on its own.
 *
 * The algorithm itself is proved against the RFC in tests/totp.test.ts. These
 * are about the doors.
 */

const SESSION_ROUTE = readFileSync("app/api/admin/session/route.ts", "utf8");
const ACCESS_ROUTE = readFileSync("app/api/access/route.ts", "utf8");
const ENROL_ROUTE = readFileSync("app/api/admin/two-factor/route.ts", "utf8");
const STORE = readFileSync("lib/admin-2fa-store.ts", "utf8");

describe("both doors ask", () => {
  it("the named-account door demands a code where one is enrolled", () => {
    assert.match(SESSION_ROUTE, /await twoFactorRequired\(email\)/);
    assert.match(SESSION_ROUTE, /await checkSecondFactor\(email, code\)/);
  });

  it("the shared-password door demands the shared code where one is enrolled", () => {
    assert.match(ACCESS_ROUTE, /await twoFactorRequired\(SHARED_DOOR\)/);
    assert.match(ACCESS_ROUTE, /await checkSecondFactor\(SHARED_DOOR, code\)/);
  });

  it("checks the password FIRST, so a wrong guess is never told a factor exists", () => {
    // Asking for a code before checking the password would tell anybody who
    // typed anything at all whether this deployment has one configured.
    const password = ACCESS_ROUTE.indexOf('verifyAccessPassword("admin", password)');
    const factor = ACCESS_ROUTE.indexOf("twoFactorRequired(SHARED_DOOR)");
    assert.ok(password > 0 && factor > 0);
    assert.ok(password < factor, "the password must be verified before the second factor is even mentioned");
  });

  it("mints no session on a failed code", () => {
    // The failure that would make all of this decorative: checking the code,
    // ignoring the answer, and setting the cookie anyway.
    const factor = SESSION_ROUTE.indexOf("checkSecondFactor");
    const mint = SESSION_ROUTE.indexOf('accessToken("admin")');
    assert.ok(factor > 0 && mint > 0);
    assert.ok(factor < mint, "the code must be checked before the admin token is minted");
    assert.match(SESSION_ROUTE, /if \(!second\.ok\) \{[^]*?return NextResponse\.json/);
  });

  it("counts wrong codes against the same rate limit as wrong passwords", () => {
    // Six digits is a million guesses. Left uncounted — or counted in a
    // separate bucket — an attacker gets a fresh budget by switching doors.
    assert.match(SESSION_ROUTE, /tooManyAttempts\(request, "admin"\)/);
    assert.match(SESSION_ROUTE, /recordFailedAttempt\(request, "admin"\)/);
    assert.match(ACCESS_ROUTE, /recordFailedAttempt\(request, "admin"\)/);
  });

  it("asks rather than refuses, so a right password does not read as wrong", () => {
    assert.match(SESSION_ROUTE, /needsCode: true/);
    assert.match(ACCESS_ROUTE, /needsCode: true/);
    for (const form of ["components/AccessForm.tsx", "components/OpenAdminButton.tsx"]) {
      const src = readFileSync(form, "utf8");
      assert.match(src, /needsCode/, `${form} should handle the ask`);
      assert.match(src, /one-time-code/, `${form} should offer a real code field`);
    }
  });
});

describe("nothing is demanded until something is enrolled", () => {
  it("an unenrolled door lets a correct password straight through", () => {
    // The whole feature is opt-in. An owner who never sets this up must be
    // exactly where they were, or shipping it locks somebody out of their
    // own site.
    const fn = STORE.slice(STORE.indexOf("export async function checkSecondFactor"), STORE.indexOf("export async function regenerateRecoveryCodes"));
    assert.match(fn, /if \(!record\) return \{ ok: true/);
  });
});

describe("a lost phone is not a locked door", () => {
  it("issues recovery codes at enrolment", () => {
    assert.match(STORE, /export function generateRecoveryCodes/);
    const codes = generateRecoveryCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10, "they must not repeat");
    for (const code of codes) assert.match(code, /^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
  });

  it("stores only their hashes, never the codes themselves", () => {
    // A store holding ten working keys beside the secret they protect is not
    // a second factor; it is a longer password written down twice.
    assert.match(STORE, /recoveryHashes: string\[\]/);
    assert.match(STORE, /createHash\("sha256"\)/);
    const confirm = STORE.slice(STORE.indexOf("export async function confirmTwoFactor"), STORE.indexOf("export type SecondFactorResult"));
    assert.match(confirm, /recoveryHashes: recoveryCodes\.map\(hashRecovery\)/);
    assert.doesNotMatch(confirm, /recoveryCodes,\s*\n\s*confirmedAt/, "the plain codes must not be written into the record");
  });

  it("spends a recovery code on use rather than leaving it live", () => {
    const fn = STORE.slice(STORE.indexOf("export async function checkSecondFactor"), STORE.indexOf("export async function regenerateRecoveryCodes"));
    assert.match(fn, /recoveryHashes: left/);
    assert.match(fn, /usedRecoveryCode: true/);
  });

  it("compares them in constant time", () => {
    assert.match(STORE, /timingSafeEqual/);
  });
});

describe("a code cannot be used twice", () => {
  it("records the step a secret was let in on, and refuses at or below it", () => {
    // Proven properly against the algorithm in tests/totp.test.ts; this is
    // that the door actually passes the mark in and stores the new one.
    const fn = STORE.slice(STORE.indexOf("export async function checkSecondFactor"), STORE.indexOf("export async function regenerateRecoveryCodes"));
    assert.match(fn, /lastUsedStep: record\.lastStep/);
    assert.match(fn, /writeTwoFactor\(who, \{ \.\.\.record, lastStep: totp\.step \}\)/);
  });
});

describe("enrolment cannot reach across doors", () => {
  it("takes the door from the session, never from the request body", () => {
    // The failure this prevents: somebody holding the shared password posting
    // `who: "<owner's email>"` and disabling the owner's own second factor,
    // which is precisely what this feature exists to stop.
    assert.match(ENROL_ROUTE, /async function doorForSession/);
    assert.doesNotMatch(ENROL_ROUTE, /body\??\.\s*who/);
  });

  it("VERIFIES the admin cookie rather than just finding one", () => {
    // The first version of this route read the jar directly and took a
    // non-empty `white_glove_admin` as proof, which is not a check at all:
    // anybody able to set that cookie to any string could have disabled the
    // owner's second factor. currentAdmin() runs isValidAccessToken against
    // the same jar. tests/admin-auth.test.ts enforces this across every admin
    // route; this says why it matters on this one.
    assert.match(ENROL_ROUTE, /currentAdmin\(\)/);
    assert.doesNotMatch(ENROL_ROUTE, /Boolean\(\s*\w+\.get\("white_glove_admin"\)/);
  });

  it("is closed to anybody not already through the admin", () => {
    assert.match(ENROL_ROUTE, /if \(!door\) return NextResponse\.json\([^]*?401/);
    assert.match(ENROL_ROUTE, /sameOrigin\(request\)/);
  });

  it("writes nothing until a code from the app has been typed back", () => {
    // A secret stored the moment it is generated is how somebody is locked
    // out by a phone with a wrong clock, or an enrolment they abandoned.
    const begin = STORE.slice(STORE.indexOf("export function beginTwoFactor"), STORE.indexOf("export async function confirmTwoFactor"));
    assert.doesNotMatch(begin, /writeTwoFactor/);
    assert.match(STORE, /export async function confirmTwoFactor[^]*?verifyTotp\(secret, code/);
  });
});

describe("the shared door is keyed apart from any account", () => {
  it("cannot collide with an email", () => {
    assert.equal(twoFactorKeyFor(SHARED_DOOR), SHARED_DOOR);
    assert.ok(!SHARED_DOOR.includes("@"), "the shared key must not look like an email address");
    assert.equal(twoFactorKeyFor("  Owner@Example.COM "), "owner@example.com");
  });
});
