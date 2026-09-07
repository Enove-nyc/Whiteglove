import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * The site notice must never sit over the owner's admin, and an admin pop-up
 * form must not be shut by a click that merely fell through from an overlay
 * above it. Both were live on 7 September: the notice's path rule could not
 * see the admin hostname (where the bare path is the screen), it appeared over
 * "Add somewhere to stay", and pressing its Close landed on the form's backdrop
 * and closed the form — seven times, with everything typed lost each time.
 * These pin the two guards so neither quietly comes back.
 */
const notice = readFileSync("components/NewSiteNotice.tsx", "utf8");
const forms = readFileSync("components/AddEntryForms.tsx", "utf8");

test("the notice stands down whenever the admin shell is on the page", () => {
  assert.match(notice, /querySelector\("\.wg-admin"\)/, "reads the admin shell off the page");
  assert.match(notice, /!onAdmin && shouldShow\(/, "the admin check gates eligibility");
});

test("the admin pop-up only closes on a press that started on its backdrop", () => {
  assert.match(forms, /onPointerDown=\{\(event\) => \{ pressedBackdrop\.current = event\.target === event\.currentTarget; \}\}/);
  assert.match(forms, /event\.target === event\.currentTarget && pressedBackdrop\.current/);
});
