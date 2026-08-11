import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const PAGE = readFileSync("app/login/page.tsx", "utf8");
const FORM = readFileSync("components/LoginForm.tsx", "utf8");
const CSS = readFileSync("app/globals.css", "utf8");

describe("login overlay", () => {
  it("is a labelled full-page auth section, not a modal dialog", () => {
    const authSection = PAGE.slice(PAGE.indexOf("<section"), PAGE.indexOf("</section>") + "</section>".length);
    assert.match(PAGE, /aria-labelledby="login-title"/);
    assert.match(authSection, /<h1 id="login-title"/);
    assert.doesNotMatch(authSection, /role="dialog"|aria-modal="true"/);
  });

  it("keeps the page and card scrollable on a 390px-wide viewport", () => {
    assert.match(PAGE, /min-h-dvh.*overflow-x-hidden overflow-y-auto/);
    assert.match(PAGE, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
    assert.match(PAGE, /overflow-x-hidden overflow-y-auto overscroll-contain/);
  });

  it("keeps labelled native form controls in the route's normal keyboard flow", () => {
    assert.match(FORM, /<form className="mt-8 space-y-5" onSubmit=\{continueToAccount\}>/);
    assert.match(FORM, /phoneSignupAvailable \? "Email address or phone number" : "Email address"/);
    assert.match(FORM, /<label className="block text-sm font-semibold text-\[var\(--navy\)\]">Password/);
    assert.match(FORM, /<button type="submit"/);
    assert.doesNotMatch(FORM, /useFocusTrap/);
  });

  it("leaves the site-wide banner above the account overlay", () => {
    assert.match(PAGE, /z-\[var\(--wg-z-auth\)\]/);
    assert.match(CSS, /--wg-z-auth: 45/);
    assert.match(CSS, /--wg-z-ad: 50/);
  });
});
