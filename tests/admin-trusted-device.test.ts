import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  checkTrustedDevice,
  mintTrustedDevice,
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_DAYS,
  trustedDeviceMaxAge,
} from "@/lib/admin-trusted-device";
import { deviceGenerationOf } from "@/lib/admin-2fa-store";
import { withReturnPath } from "@/lib/return-path";

/**
 * Remembering a device that has already produced a correct code.
 *
 * WHY IT EXISTS, in the owner's words: he signs in many times a day, and
 * typing six digits off an authenticator every single time made him want the
 * second factor gone altogether. A second factor nobody can live with gets
 * switched off, and then there is none — so the code is asked once per device
 * per month instead of once per sign-in.
 *
 * WHAT MUST STAY TRUE, and these are the assertions worth having:
 * the password is still required every time; a cookie signed for one secret
 * dies when the secret changes; the owner can drop every device at once; and
 * the expiry is enforced here rather than left to the browser.
 */

const WHO = "shared-password";
const SECRET = "JBSWY3DPEHPK3PXP";

describe("a remembered device", () => {
  it("verifies the cookie it just issued", () => {
    const cookie = mintTrustedDevice(WHO, SECRET, 0);
    assert.ok(cookie);
    assert.equal(checkTrustedDevice(cookie, WHO, SECRET, 0), true);
  });

  it("refuses nothing, rubbish, and a cookie with the wrong shape", () => {
    for (const value of [undefined, null, "", "nonsense", "1.2.3", "abc.def"]) {
      assert.equal(checkTrustedDevice(value, WHO, SECRET, 0), false, `accepted ${String(value)}`);
    }
  });

  it("stops verifying once the second factor is re-enrolled", () => {
    // THE HOLE A GENERATION COUNTER ALONE WOULD LEAVE. Turning two-factor off
    // deletes the record; turning it on writes a new one with a new secret and
    // a generation back at zero. Signing over the secret means devices
    // remembered under the old one die on their own, with nothing to reset.
    const cookie = mintTrustedDevice(WHO, SECRET, 0)!;
    assert.equal(checkTrustedDevice(cookie, WHO, "NEWSECRET234567", 0), false);
  });

  it("stops verifying when the owner forgets every device", () => {
    // The other case: a phone lost while the secret stays the same. Bumping
    // the generation must not require re-enrolling the authenticator he has.
    const cookie = mintTrustedDevice(WHO, SECRET, 0)!;
    assert.equal(checkTrustedDevice(cookie, WHO, SECRET, 1), false);
  });

  it("is not a cookie for a different door", () => {
    const cookie = mintTrustedDevice(WHO, SECRET, 0)!;
    assert.equal(checkTrustedDevice(cookie, "someone@example.com", SECRET, 0), false);
  });

  it("enforces its own expiry rather than trusting the browser to", () => {
    const now = Date.now();
    const cookie = mintTrustedDevice(WHO, SECRET, 0, TRUSTED_DEVICE_DAYS, now)!;
    // A day before it lapses, and a minute after.
    assert.equal(checkTrustedDevice(cookie, WHO, SECRET, 0, now + 29 * 86_400_000), true);
    assert.equal(checkTrustedDevice(cookie, WHO, SECRET, 0, now + 31 * 86_400_000), false);
  });

  it("cannot have its expiry pushed out by editing the cookie", () => {
    // The expiry is inside the signature, so moving it invalidates it.
    const now = Date.now();
    const cookie = mintTrustedDevice(WHO, SECRET, 0, 1, now)!;
    const [, signature] = cookie.split(".");
    const forged = `${now + 400 * 86_400_000}.${signature}`;
    assert.equal(checkTrustedDevice(forged, WHO, SECRET, 0, now + 2 * 86_400_000), false);
  });

  it("counts a record written before devices existed as the first generation", () => {
    assert.equal(deviceGenerationOf(null), 0);
    assert.equal(deviceGenerationOf({ secret: SECRET, confirmedAt: "x", recoveryHashes: [] }), 0);
    assert.equal(deviceGenerationOf({ secret: SECRET, confirmedAt: "x", recoveryHashes: [], deviceGeneration: 3 }), 3);
  });

  it("agrees with itself about how long a month is", () => {
    assert.equal(trustedDeviceMaxAge(), TRUSTED_DEVICE_DAYS * 24 * 60 * 60);
  });
});

describe("what the sign-in route does with it", () => {
  const route = readFileSync("app/api/access/route.ts", "utf8");

  it("still checks the password before anything else", () => {
    // The whole safety of this feature. A remembered device skips the CODE,
    // never the password — so a stolen password alone opens nothing from a
    // machine that has never produced a code.
    const passwordAt = route.indexOf('verifyAccessPassword("admin"');
    const deviceAt = route.indexOf("checkTrustedDevice(");
    assert.ok(passwordAt > 0 && deviceAt > 0);
    assert.ok(passwordAt < deviceAt, "the device cookie is consulted before the password");
  });

  it("only ever remembers a device off the back of a correct code", () => {
    // rememberDevice must be assigned after checkSecondFactor has passed, not
    // read straight off the request.
    const checkAt = route.indexOf("checkSecondFactor(");
    const assignAt = route.indexOf("rememberThisDevice = body.rememberDevice");
    assert.ok(checkAt > 0 && assignAt > 0);
    assert.ok(checkAt < assignAt, "the device is remembered before the code is verified");
  });

  it("records a skipped code as its own kind of sign-in", () => {
    // Rolled into "admin code" it would be invisible, which is the wrong thing
    // for a security log to be.
    assert.match(route, /how: trusted \? "remembered device" : "admin code"/);
  });

  it("keeps the cookie out of the page's reach", () => {
    const at = route.indexOf(`response.cookies.set(${"TRUSTED_DEVICE_COOKIE"}`);
    assert.ok(at > 0, "the device cookie is not set by name");
    assert.match(route.slice(at, at + 320), /httpOnly: true/);
    assert.match(route.slice(at, at + 320), /sameSite: "lax"/);
  });

  it("names the cookie from the one place that defines it", () => {
    assert.ok(route.includes("TRUSTED_DEVICE_COOKIE"));
    assert.equal(TRUSTED_DEVICE_COOKIE, "white_glove_admin_device");
  });
});

describe("being signed out does not lose the page", () => {
  const LOGIN = "/admin/login";

  it("carries the page they were on", () => {
    // The owner's report: signed out mid-screen, password back in, and the
    // admin front page every time.
    assert.equal(
      withReturnPath(LOGIN, "/admin/settings/proof"),
      "/admin/login?next=%2Fadmin%2Fsettings%2Fproof",
    );
  });

  it("keeps the query string, because half a page is not the page", () => {
    assert.equal(
      withReturnPath(LOGIN, "/admin/alerts?tab=sent"),
      "/admin/login?next=%2Fadmin%2Falerts%3Ftab%3Dsent",
    );
  });

  it("works on a deployment served from an admin hostname", () => {
    // There the paths carry no /admin prefix and the login is at /login.
    assert.equal(withReturnPath("/login", "/settings/proof"), "/login?next=%2Fsettings%2Fproof");
  });

  it("never sends a login page back to itself", () => {
    for (const here of ["/login", "/admin/login", "/admin/login?next=%2Fx", "/login/"]) {
      assert.equal(withReturnPath(LOGIN, here), LOGIN, `${here} would loop`);
    }
  });

  it("refuses to be turned into an open redirect", () => {
    // A timed-out session must not become a way to bounce somebody off-site.
    for (const here of ["//evil.example.com", "https://evil.example.com", "http://evil.example.com/x", "evil"]) {
      assert.equal(withReturnPath(LOGIN, here), LOGIN, `${here} was accepted`);
    }
  });

  it("falls back to the plain login address when there is no page", () => {
    assert.equal(withReturnPath(LOGIN, null), LOGIN);
    assert.equal(withReturnPath(LOGIN, undefined), LOGIN);
    assert.equal(withReturnPath(LOGIN, ""), LOGIN);
  });

  it("is what the idle redirect actually calls", () => {
    const source = readFileSync("components/IdleLogout.tsx", "utf8");
    assert.ok(source.includes("withReturnPath(redirectTo, here)"), "the idle redirect drops the page again");
  });
});
