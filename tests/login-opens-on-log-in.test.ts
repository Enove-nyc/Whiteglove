import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
const PAGE = readFileSync("app/login/page.tsx", "utf8");
const FORM = readFileSync("components/LoginForm.tsx", "utf8");
const GATE = readFileSync("components/SignInGate.tsx", "utf8");
describe("the login page, with sign-up open", () => {
  it("opens both public authentication surfaces on login", () => {
    assert.match(PAGE, /initialMode="login"/); assert.match(GATE, /initialMode="login"/); assert.match(FORM, /initialMode = "login"/);
  });
  it("offers account creation to anyone, from the login page", () => {
    // Sign-up is open (owner, 19 November 2026: "we should let new people sign
    // up"). The page still opens on login; "Create an account" switches to it.
    assert.match(FORM, /Create an account/);
    assert.doesNotMatch(FORM, /New accounts require an invitation/);
    assert.match(FORM, /phone: contactPhone, invitationToken/);
    const register = readFileSync("app/api/account/register/route.ts", "utf8");
    assert.doesNotMatch(register, /New accounts require an invitation link/);
    // An invitation, when one is used, is still checked against its address.
    assert.match(register, /invitation\.identity !== identity\.value/);
  });
});
