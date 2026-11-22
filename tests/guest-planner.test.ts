import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * The planner is open to everyone (AGENTS.md, 18 November 2026). A visitor who
 * is not signed in builds a trip kept in their own browser only: nothing is
 * stored on our side, and nothing that runs on our server or a paid service
 * is offered to them.
 */
const PAGE = readFileSync("app/itinerary/page.tsx", "utf8");
const BUILDER = readFileSync("components/ItineraryBuilder.tsx", "utf8");

describe("the planner without an account", () => {
  it("does not send a visitor to sign in", () => {
    assert.doesNotMatch(PAGE, /requireSignedIn/);
    assert.match(PAGE, /const guest = !account\?\.email;/);
    assert.match(PAGE, /guest=\{guest\}/);
  });

  it("keeps a guest's trip in their browser and never posts it", () => {
    assert.match(BUILDER, /window\.localStorage\.setItem\(GUEST_TRIP_KEY, JSON\.stringify\(next\)\)/);
    const persist = BUILDER.slice(BUILDER.indexOf("function persist(next: Itinerary)"));
    const guestBranch = persist.slice(0, persist.indexOf("let completion"));
    assert.match(guestBranch, /if \(guest\) \{/);
    assert.match(guestBranch, /return Promise\.resolve\(true\);/);
    assert.doesNotMatch(guestBranch, /fetch\(/);
  });

  it("offers a guest nothing that runs on our server or a paid service", () => {
    assert.match(BUILDER, /\{!guest && <button type="button" onClick=\{askAi\}/);
    assert.match(BUILDER, /\{!guest && \(\s*<div[^>]*>\s*<span className=\{caption\}>Auto-fill from a flight number/);
    assert.match(BUILDER, /\{!overnight && !guest && \(/);
    assert.match(BUILDER, /\{!guest && <button type="button" onClick=\{\(\) => setTab\(tab === "import"/);
    assert.match(BUILDER, /\{!guest && <details[^>]*>\s*<summary[^>]*>\s*<span[^>]*>Share this itinerary/);
    assert.match(BUILDER, /guest \? \{ times: \{\}, sources: \{\}, engine: null, partial: false \} : await fetchRoadTimes/);
  });

  it("says where a guest's trip is kept, in Terms (the planner itself stays wordless)", () => {
    assert.match(readFileSync("app/terms/page.tsx", "utf8"), /kept only in your own\s+browser on that device/);
  });
});
