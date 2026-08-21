import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * A wired (real) trip must never read like the Rome showcase it was built
 * from. These pin the specific ways the two used to bleed together — a real
 * trip telling a client with a live advisor they are "on your own", a
 * Directions button that opens nothing, a landing time sitting in "Where" —
 * by checking the conditions are actually there in the source, the same way
 * tests/companion-chat.test.ts pins the route's fences.
 */

const APP = readFileSync("components/companion/CompanionApp.tsx", "utf8");

describe("a live advisor thread is never called 'on your own'", () => {
  it("the home screen's guide-mode card only shows without a real chat", () => {
    assert.match(APP, /isGuideMode && !usesRealChat && \(/);
  });

  it("the Guide tab's own kicker reads as an advisor once a real chat exists", () => {
    assert.match(APP, /chat: hasConcierge \|\| usesRealChat \? "Your advisor" : "On your own"/);
  });
});

describe("Directions only appears for a real place, never a flight", () => {
  it("is gated on having a place and not being a flight", () => {
    assert.match(APP, /actHasDirections = Boolean\(act\.place\) && act\.kind !== "travel"/);
  });

  it("links to a real maps search rather than doing nothing", () => {
    const button = APP.slice(APP.indexOf("actHasDirections &&"), APP.indexOf("Ask to move this"));
    assert.match(button, /maps\/search\/\?api=1&query=\$\{encodeURIComponent\(act\.place\)\}/);
  });
});

describe("a landing time rides with When, not Where", () => {
  it("the activity screen's When row folds in arriveNote instead of leaving it in place", () => {
    const rows = APP.slice(APP.indexOf("const actRows"), APP.indexOf("actHasDirections ="));
    assert.match(rows, /label: "When", value: act\.arriveNote \? `\$\{act\.time\} · \$\{act\.arriveNote\}` : act\.time/);
  });
});

describe("the profile screen is honest about who is looking at it", () => {
  it("a client on a share code is never told they are 'signed in'", () => {
    const screen = APP.slice(APP.indexOf("const profileScreen"), APP.indexOf("let body: ReactNode"));
    assert.match(screen, /liveChat\?\.side === "client" \? "Your trip" : "Signed in as"/);
    assert.match(screen, /You opened this with the code your adviser sent you/);
  });
});

describe("a finished trip never opens as if it were day one", () => {
  it("the home screen's day pill reads the trip's own tripFinished flag", () => {
    assert.match(APP, /trip\.tripFinished \? "Trip finished" : `Day \$\{trip\.todayIndex \+ 1\} of \$\{trip\.days\.length\}`/);
  });
});

describe("the empty guide does not promise content that will never come", () => {
  it("says nothing is there rather than naming features that might be off", () => {
    const guide = APP.slice(APP.indexOf("const guideChat"), APP.indexOf("const walletScreen"));
    assert.match(guide, /There is nothing local to show for this trip yet\./);
    assert.doesNotMatch(guide, /kosher food, the Shabbos times and the sights/);
  });
});
