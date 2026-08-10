import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const LOADER = readFileSync("lib/google-maps-loader.ts", "utf8");
const STATUS = readFileSync("components/MapKeyStatus.tsx", "utf8");
const AREA = readFileSync("components/AreaMap.tsx", "utf8");

describe("Google Maps loader", () => {
  it("uses loading=async with importLibrary, not a classic callback race", () => {
    const scriptSrc = LOADER.match(/script\.src = `([^`]+)`/)?.[1] ?? "";
    assert.match(scriptSrc, /loading=async/);
    assert.doesNotMatch(scriptSrc, /callback=/);
    assert.match(LOADER, /importLibrary/);
    assert.match(LOADER, /gm_authFailure/);
    assert.match(LOADER, /probeGoogleMaps/);
    assert.match(LOADER, /GOOGLE_MAPS_LOAD_MS/);
    // A false from a bootstrap race must not poison every later caller.
    assert.match(LOADER, /pending = null/);
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

  it("public map prefers Google when Map exists and falls back on auth failure", () => {
    assert.match(AREA, /onGoogleMapsAuthFailure/);
    assert.match(AREA, /drawOsm/);
    assert.match(AREA, /drawGoogle/);
    assert.match(AREA, /useGoogle \|\| googleMaps\(\)\?\.Map/);
    // Deciding must not claim the OpenStreetMap scroll-zoom wording.
    assert.match(AREA, /Loading the map/);
  });
});
