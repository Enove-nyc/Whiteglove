import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * BusinessBrandPanel's whole claim is that its preview is the real thing —
 * "what this shows is exactly what PrintableItinerary puts on the cover"
 * (see its own header comment). That claim broke the moment
 * PrintableItinerary learned to credit whichever brand actually made the
 * document (see tests/two-brands-print.test.ts): the panel still always
 * showed the kosher fallback, even for a Business account signed in on
 * whitegloveitineraries.com. It now takes the same siteBrand its printed
 * document does, resolved server-side in app/account/page.tsx.
 */

const PANEL = readFileSync("components/BusinessBrandPanel.tsx", "utf8");
const PAGE = readFileSync("app/account/page.tsx", "utf8");

describe("the Business branding preview matches whichever brand the account is on", () => {
  it("takes a siteBrand prop rather than assuming kosher", () => {
    assert.match(PANEL, /siteBrand: SiteBrand/);
    assert.match(PANEL, /BRAND_NAME\[siteBrand\]/);
    assert.match(PANEL, /BRAND_DOMAIN\[siteBrand\]/);
  });

  it("no longer hardcodes the kosher fallback text outside the wordmark's own ternary", () => {
    assert.doesNotMatch(PANEL, /: "A White Glove Kosher Travel journey"/);
    assert.doesNotMatch(PANEL, /"Planned with whiteglovekoshertravel\.com"/);
    assert.doesNotMatch(PANEL, /: "whiteglovekoshertravel\.com"/);
    // The explanatory prose above the form said the same thing outright too.
    assert.doesNotMatch(PANEL, /planned with whiteglovekoshertravel\.com/);
    assert.match(PANEL, /planned with \{siteDomain\}/);
  });

  it("app/account/page.tsx resolves the real brand and passes it down", () => {
    assert.match(PAGE, /const siteBrand = await currentBrand\(\)/);
    assert.match(PAGE, /<BusinessBrandPanel brand=\{brand \?\? emptyBrand\(who\)\} siteBrand=\{siteBrand\}/);
  });
});
