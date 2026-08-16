import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * How an advertisement is allowed to look and behave — the presentation half
 * of the promises in advertising-boundary.test.ts.
 *
 * Two of these exist because they were broken once. The popup opened on top
 * of the first paint, before the visitor had seen a single destination; and
 * the bottom banner sat on the mobile bottom bar and covered the navigation.
 * The rest keep an advertisement from dressing up as editorial content.
 */

const SITE_PROMOTIONS = readFileSync("components/SitePromotions.tsx", "utf8");
const BANNER = readFileSync("components/PromotionBanner.tsx", "utf8");

// Comments may name wg-card to explain why it is banned; only code counts.
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("the popup waits for the visitor", () => {
  it("NEVER OPENS ON ARRIVAL — twelve seconds or a real scroll first", () => {
    assert.match(SITE_PROMOTIONS, /POPUP_DELAY_MS = 12_000/, "the dwell gate is gone");
    assert.match(SITE_PROMOTIONS, /POPUP_SCROLL_PX = 600/, "the scroll gate is gone");
    // Exactly one line in the file may open the popup, and it must sit inside
    // the gate: after reveal() is declared and before the timer arms it. The
    // fetch handler may only arm, never show.
    const shows = SITE_PROMOTIONS.match(/setShowPopup\(true\)/g) ?? [];
    assert.equal(shows.length, 1, "a second path can now open the popup");
    const revealAt = SITE_PROMOTIONS.indexOf("function reveal()");
    const showAt = SITE_PROMOTIONS.indexOf("setShowPopup(true)");
    const timerAt = SITE_PROMOTIONS.indexOf("window.setTimeout(reveal, POPUP_DELAY_MS)");
    assert.ok(revealAt > -1 && timerAt > -1, "the gate is gone");
    assert.ok(revealAt < showAt && showAt < timerAt, "the popup is shown outside the gate");
    assert.match(SITE_PROMOTIONS, /setArmedPopup\(data\.popup\)/, "the fetch handler shows instead of arming");
  });

  it("keeps every frequency control it had", () => {
    // Once per session, capped per day, and the impression counted only when
    // the popup is actually on screen.
    assert.match(SITE_PROMOTIONS, /wg-popup-seen:/, "the once-per-session marker is gone");
    assert.match(SITE_PROMOTIONS, /underDailyCap\(/, "the daily cap is gone");
    assert.match(SITE_PROMOTIONS, /recordView\(/, "the daily-cap count is never recorded");
  });

  it("stays easy to leave", () => {
    // Escape is handled by the focus trap; the close button and "No thanks"
    // both call the same closer.
    assert.match(SITE_PROMOTIONS, /useFocusTrap.*showPopup, closePopup/);
    assert.match(SITE_PROMOTIONS, /label="Close" onClick=\{closePopup\}/);
    assert.match(SITE_PROMOTIONS, /No thanks/);
  });
});

describe("an advertisement does not dress as content", () => {
  it("WEARS THE AD UNIFORM, NOT THE DESTINATION CARD'S", () => {
    // wg-card is the destination card. An advertisement styled with it would
    // read as an editorial listing, which is the one thing it must never do.
    assert.doesNotMatch(code(SITE_PROMOTIONS), /wg-card/);
    assert.doesNotMatch(code(BANNER), /wg-card/);
    // The uniform: a gold rule along the top of every card-shaped placement.
    const rules = (SITE_PROMOTIONS + BANNER).match(/border-t-2 border-t-\[var\(--gold\)\]/g) ?? [];
    assert.ok(rules.length >= 3, `only ${rules.length} placements carry the gold top rule`);
  });

  it("leans on the creative, not on copy", () => {
    // The image sits above the words in both card shapes, and a long
    // description cannot push the creative off screen.
    assert.ok(BANNER.indexOf("promotion.imageUrl") < BANNER.indexOf("promotion.title}</h2>"), "the banner puts words before the creative");
    assert.match(BANNER, /line-clamp-2/);
    assert.match(SITE_PROMOTIONS, /line-clamp-2/);
  });
});

describe("an advertisement does not cover the controls", () => {
  it("KEEPS THE BOTTOM BANNER ABOVE THE MOBILE BOTTOM BAR", () => {
    // bottom-14 clears the fixed mobile bar; sm:bottom-0 drops to the edge
    // where the bar does not exist. Losing either covers the navigation.
    assert.match(SITE_PROMOTIONS, /bottom-14 [^"]*sm:bottom-0/, "the bottom banner sits on the mobile navigation again");
  });

  it("stacks by the named layers", () => {
    // The full ordering lives in layers.test.ts; this only pins that the
    // promotion shapes still use the named variables at all.
    assert.match(SITE_PROMOTIONS, /z-\[var\(--wg-z-ad\)\]/);
    assert.match(SITE_PROMOTIONS, /z-\[var\(--wg-z-modal\)\]/);
  });
});
