import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const LOADER = readFileSync("lib/google-maps-loader.ts", "utf8");
const STATUS = readFileSync("components/MapKeyStatus.tsx", "utf8");
const AREA = readFileSync("components/AreaMap.tsx", "utf8");

describe("Google Maps loader", () => {
  it("uses the classic callback, not loading=async with Map constructor", () => {
    assert.match(LOADER, /callback=\$\{cbName\}/);
    // Comments may mention the old loading=async mistake; the script URL must not.
    const scriptSrc = LOADER.match(/script\.src = `([^`]+)`/)?.[1] ?? "";
    assert.match(scriptSrc, /callback=/);
    assert.doesNotMatch(scriptSrc, /loading=async/);
    assert.match(LOADER, /gm_authFailure/);
    assert.match(LOADER, /probeGoogleMaps/);
    assert.match(LOADER, /GOOGLE_MAPS_LOAD_MS/);
  });

  it("admin test constructs a map and names the common Google errors", () => {
    assert.match(STATUS, /probeGoogleMaps/);
    assert.match(STATUS, /RefererNotAllowedMapError/);
    assert.match(STATUS, /ApiNotActivatedMapError/);
    assert.match(STATUS, /BillingNotEnabledMapError/);
    assert.match(STATUS, /InvalidKeyMapError/);
    assert.match(STATUS, /timeout/);
    // Fingerprint only — never dump the full key into the UI.
    assert.match(STATUS, /slice\(0, 6\)/);
    assert.doesNotMatch(STATUS, /googleMapsBrowserKey\(\)\s*\n\s*[^;]*<\/code>/);
  });

  it("public map falls back to OSM on auth failure", () => {
    assert.match(AREA, /onGoogleMapsAuthFailure/);
    assert.match(AREA, /drawOsm/);
  });
});
