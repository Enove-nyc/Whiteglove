import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
const PAGE = readFileSync("app/login/page.tsx", "utf8");
const FORM = readFileSync("components/LoginForm.tsx", "utf8");
const GATE = readFileSync("components/SignInGate.tsx", "utf8");
describe("public authentication is login-only", () => {
  it("opens both public authentication surfaces on login", () => {
    assert.match(PAGE, /initialMode="login"/); assert.match(GATE, /initialMode="login"/); assert.match(FORM, /initialMode = "login"/);
  });
  it("reserves account creation for the invitation flow", () => {
    assert.match(FORM, /invitationToken && initialMode === "signup"/);
    assert.doesNotMatch(FORM, /setMode\("signup"\)/);
    assert.match(FORM, /phone: contactPhone, invitationToken/);
    assert.doesNotMatch(PAGE, /Sign in or create an account/);
  });
});
