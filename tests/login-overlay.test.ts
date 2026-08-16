import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const PAGE = readFileSync("app/login/page.tsx", "utf8");
const GATE = readFileSync("components/SignInGate.tsx", "utf8");
const FORM = readFileSync("components/LoginForm.tsx", "utf8");

/**
 * REVERSED, at the owner's word. This used to assert /login was "a labelled
 * full-page auth section, not a modal dialog" — true then, and still true of
 * /login itself, which stays a real page for direct navigation (the header's
 * Account icon, the mobile bar, a bookmarked link). What changed is that a
 * SEPARATE, real modal now exists for the case the brief calls out
 * specifically: a signed-out visitor interrupted mid-action (adding to
 * Route, an itinerary, a favorite, a review) gets a small dialog that
 * resumes what they were doing, not a trip to another page and back.
 */
describe("sign-in has two surfaces now, not one", () => {
  it("/login is still a real page, reachable directly", () => {
    assert.match(PAGE, /export default async function LoginPage/);
    assert.match(PAGE, /<LoginForm/);
  });

  it("the interrupt dialog is a real, labelled, focus-trapped modal", () => {
    assert.match(GATE, /role="dialog"/);
    assert.match(GATE, /aria-modal="true"/);
    assert.match(GATE, /aria-labelledby="sign-in-gate-title"/);
    assert.match(GATE, /useFocusTrap/);
  });

  it("closes on Escape and on a click outside it", () => {
    assert.match(GATE, /useFocusTrap<HTMLDivElement>\(Boolean\(pending\), close\)/);
    assert.match(GATE, /event\.target === event\.currentTarget/);
  });

  it("uses the named modal layer, not a bare z-index", () => {
    assert.match(GATE, /z-\[var\(--wg-z-modal\)\]/);
  });
});

describe("the dialog resumes the action rather than losing it", () => {
  it("requireSignIn runs the action immediately when already signed in", () => {
    assert.match(GATE, /if \(signedIn\) \{\s*onSuccess\(\);/);
  });

  it("LoginForm can report success without navigating, for the dialog's sake", () => {
    assert.match(FORM, /onSuccess\?: \(\) => void/);
    assert.match(FORM, /if \(onSuccess\) \{\s*onSuccess\(\);\s*return;\s*\}/);
  });

  it("the dialog runs the pending action and closes once sign-in succeeds", () => {
    assert.match(GATE, /const action = pending\.onSuccess;/);
    assert.match(GATE, /setPending\(null\);\s*action\(\);/);
  });
});

describe("the wording is short and action-specific", () => {
  it("defaults to \"Sign in to save\", never a generic \"please log in\"", () => {
    assert.match(GATE, /const DEFAULT_REASON = "Sign in to save";/);
  });

  it("every gated action in the codebase gives its own short reason", () => {
    for (const file of [
      "components/SavePlaceButtons.tsx",
      "components/DestinationActions.tsx",
      "components/SaveTripItemButton.tsx",
      "components/SharedItineraryActions.tsx",
      "components/ItineraryBuilder.tsx",
      "components/MyRouteDashboard.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /requireSignIn\(/, `${file} does not use the sign-in gate`);
      assert.match(source, /"Sign in to /, `${file} has no short reason for its gate`);
    }
  });
});
