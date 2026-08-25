import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { base32Decode, base32Encode, otpauthUri, randomSecret, stepFor, totpCode, verifyTotp } from "@/lib/totp";

/**
 * The one thing in this repository that is worth proving rather than
 * reviewing.
 *
 * lib/totp.ts is written out by hand instead of installed, on the grounds that
 * TOTP is small and completely specified — which is only a good trade if the
 * implementation is actually checked against the specification. RFC 6238
 * publishes test vectors precisely so that can be done. Every one of them runs
 * below. If any fails, the codes this site expects are not the codes an
 * authenticator app shows, and nobody gets into the admin.
 */

// RFC 6238, Appendix B. The SHA1 seed is the ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));
const RFC_VECTORS: Array<[seconds: number, code: string]> = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("RFC 6238's own test vectors", () => {
  for (const [seconds, expected] of RFC_VECTORS) {
    it(`T=${seconds} gives ${expected}`, () => {
      assert.equal(totpCode(RFC_SECRET, stepFor(seconds * 1000), 8), expected);
    });
  }

  it("the six digits an app actually shows are the last six of those", () => {
    for (const [seconds, expected] of RFC_VECTORS) {
      assert.equal(totpCode(RFC_SECRET, stepFor(seconds * 1000)), expected.slice(-6));
    }
  });
});

describe("base32, the form a secret is typed in", () => {
  it("round-trips", () => {
    for (const text of ["", "a", "ab", "abc", "abcd", "abcde", "12345678901234567890"]) {
      assert.equal(base32Decode(base32Encode(Buffer.from(text))).toString(), text);
    }
  });

  it("reads back a key somebody typed with spaces or in lowercase", () => {
    const secret = randomSecret();
    const typed = (secret.match(/.{1,4}/g) ?? []).join(" ").toLowerCase();
    assert.deepEqual(base32Decode(typed), base32Decode(secret));
  });

  it("refuses something that is not base32 rather than quietly reading part of it", () => {
    assert.throws(() => base32Decode("not-valid-1890!"));
  });

  it("makes a 160-bit secret, which is what RFC 4226 asks for", () => {
    assert.equal(base32Decode(randomSecret()).length, 20);
    assert.notEqual(randomSecret(), randomSecret());
  });
});

describe("checking a code somebody typed", () => {
  const secret = randomSecret();
  const now = 1_800_000_000_000;
  const code = (at: number) => totpCode(secret, stepFor(at));

  it("accepts the code for right now", () => {
    assert.deepEqual(verifyTotp(secret, code(now), { now }), { ok: true, step: stepFor(now) });
  });

  it("accepts one step either side, for a slow typist and a drifting clock", () => {
    assert.equal(verifyTotp(secret, code(now - 30_000), { now }).ok, true);
    assert.equal(verifyTotp(secret, code(now + 30_000), { now }).ok, true);
  });

  it("refuses two steps out", () => {
    assert.deepEqual(verifyTotp(secret, code(now - 90_000), { now }), { ok: false, reason: "wrong" });
    assert.deepEqual(verifyTotp(secret, code(now + 90_000), { now }), { ok: false, reason: "wrong" });
  });

  it("refuses a code that has already been used", () => {
    // THE ONE THIS EXISTS FOR. A code lives up to ninety seconds across the
    // drift window, which is long enough to be read over a shoulder, left in a
    // chat message, or caught in a screen share. Without this it is not a
    // one-time password at all, merely a short-lived one.
    const used = verifyTotp(secret, code(now), { now });
    assert.equal(used.ok, true);
    const step = used.ok ? used.step : -1;
    assert.deepEqual(verifyTotp(secret, code(now), { now, lastUsedStep: step }), { ok: false, reason: "reused" });
  });

  it("still accepts the NEXT code after one has been used", () => {
    const first = verifyTotp(secret, code(now), { now });
    const step = first.ok ? first.step : -1;
    const later = now + 30_000;
    assert.equal(verifyTotp(secret, code(later), { now: later, lastUsedStep: step }).ok, true);
  });

  it("tells a malformed entry apart from a wrong one", () => {
    assert.deepEqual(verifyTotp(secret, "12345", { now }), { ok: false, reason: "malformed" });
    assert.deepEqual(verifyTotp(secret, "abcdef", { now }), { ok: false, reason: "malformed" });
    assert.deepEqual(verifyTotp(secret, "000000000", { now }), { ok: false, reason: "malformed" });
  });

  it("reads a code typed with a space in the middle, the way apps show it", () => {
    const shown = code(now);
    assert.equal(verifyTotp(secret, `${shown.slice(0, 3)} ${shown.slice(3)}`, { now }).ok, true);
  });

  it("refuses a wrong code", () => {
    const wrong = String((Number(code(now)) + 1) % 1_000_000).padStart(6, "0");
    assert.deepEqual(verifyTotp(secret, wrong, { now }), { ok: false, reason: "wrong" });
  });
});

describe("the otpauth link", () => {
  it("carries everything an app needs, and says SHA1 explicitly", () => {
    const uri = otpauthUri({ secret: "ABCDEFGH", account: "someone@example.com", issuer: "White Glove" });
    assert.match(uri, /^otpauth:\/\/totp\//);
    assert.match(uri, /secret=ABCDEFGH/);
    assert.match(uri, /algorithm=SHA1/);
    assert.match(uri, /digits=6/);
    assert.match(uri, /period=30/);
    // The label is what the app shows in its list; both halves must survive.
    assert.ok(decodeURIComponent(uri.split("?")[0]).includes("White Glove:someone@example.com"));
  });
});
