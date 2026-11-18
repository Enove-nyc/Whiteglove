import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * One admin, on the one site. (It carried an authenticator-app second factor
 * until 18 November 2026, when the owner had it removed entirely.)
 *
 * UNTIL 18 NOVEMBER 2026 this file held the opposite: the itineraries
 * deployment read the same private store as the kosher one but had no second
 * factor, so its /admin and /api/admin were shut and sent to the kosher host.
 * The two codebases are merged now (AGENTS.md, "one site, Kosher Travel
 * closed"): the admin with its six-digit second factor lives here, and the
 * owner moves it onto its own subdomain with ADMIN_HOST / ADMIN_HOST_ONLY.
 * What must stay true is that there is no door onto the admin without that
 * second factor, and that nothing still sends it to the closed kosher domain.
 */

const MIDDLEWARE = readFileSync("middleware.ts", "utf8");

describe("the one admin door", () => {
  it("is not sent to the closed kosher domain any more", () => {
    assert.doesNotMatch(MIDDLEWARE, /BRAND_ORIGIN\.kosher\), 307\)/);
    assert.doesNotMatch(MIDDLEWARE, /configuredBrand\(\) === "itineraries" && pathname\.startsWith\("\/api\/admin\/"\)/);
  });

  it("asks for no authenticator code: the owner had it removed (18 November 2026)", () => {
    // The admin password, or a signed-in administrator account, is the check,
    // behind the attempt limit. Nothing may quietly bring a code prompt back.
    for (const file of ["app/api/access/route.ts", "app/api/admin/session/route.ts", "components/AccessForm.tsx", "components/OpenAdminButton.tsx"]) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /needsCode|checkSecondFactor|authenticator app/, file);
    }
    assert.match(readFileSync("app/api/access/route.ts", "utf8"), /tooManyAttempts\(request, body\.scope\)/);
  });

  it("still requires the admin cookie for every admin page", () => {
    assert.match(MIDDLEWARE, /adminPath\.startsWith\("\/admin"\) && adminPath !== "\/admin\/login"/);
    assert.match(MIDDLEWARE, /timingSafeEqual\(request\.cookies\.get\("white_glove_admin"\)\?\.value, token\)/);
  });

  it("can live on its own subdomain only", () => {
    assert.match(MIDDLEWARE, /process\.env\.ADMIN_HOST_ONLY === "1" && pathname\.startsWith\("\/admin"\)/);
  });
});
