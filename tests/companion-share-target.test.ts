// Legacy advisor gates remain tested below. The self-service companion
// is exercised against real APIs and browser contexts in traveler-companion-journeys.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Sharing a place from outside the app — Google Maps' own share sheet — into
 * White Glove: the manifest registers the app as a Web Share Target, the page
 * turns what arrives into a plain line of text, and the advisor picks which
 * client's thread it lands in, the same way any other message does.
 */

const MANIFEST = readFileSync("app/manifest.ts", "utf8");
const APP_PAGE = readFileSync("app/app/page.tsx", "utf8");
const APP = readFileSync("components/companion/CompanionApp.tsx", "utf8");

describe("a shared place waits for the advisor to pick a client, then lands in that thread's composer", () => {
  it("a shared draft that arrives on the advisor's inbox opens straight to Messages", () => {
    assert.match(APP, /screen: sharedDraft && advisorInbox \? "messages" : "home"/);
  });

  it("AdvisorInbox is told about the pending share and how to clear it", () => {
    assert.match(APP, /<AdvisorInbox pendingShare=\{pendingShare\} onPendingShareUsed=\{\(\) => setPendingShare\(null\)\} \/>/);
  });

  it("opening a client's thread carries the pending share into its composer", () => {
    const openBlock = APP.slice(APP.indexOf("if (open) {"), APP.indexOf("return (\n    <div style={{ padding: \"16px 16px 28px\""));
    assert.match(openBlock, /initialDraft=\{pendingShare\}/);
    assert.match(openBlock, /onInitialDraftUsed=\{onPendingShareUsed\}/);
  });

  it("LiveChat puts a shared draft straight into the composer, then hands the callback back", () => {
    const effect = APP.slice(APP.indexOf("A place shared in from outside, put straight"), APP.indexOf("A place shared in from outside, put straight") + 900);
    assert.match(effect, /setDraft\(initialDraft\)/);
    assert.match(effect, /onInitialDraftUsedRef\.current\?\.\(\)/);
    // AND IT MUST STAY AN EFFECT. The callback sets state in the PARENT, so
    // the render-time pattern used elsewhere in this repo for the same-looking
    // shape would update one component while rendering another — which React
    // refuses. The ref is written in its own effect rather than during render,
    // and the staging is deferred, so the two lint errors are fixed without
    // moving this into render.
    assert.match(effect, /useEffect\(/);
    // The CALL, not the word — the comment above it necessarily names the hook
    // it explains not using.
    assert.doesNotMatch(effect, /useOnValueChange\(/);
  });
});
