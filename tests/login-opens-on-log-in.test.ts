import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codeOf } from "./helpers/source";

const FORM = codeOf("components/LoginForm.tsx");
const PAGE = codeOf("app/login/page.tsx");
const GATE = codeOf("components/SignInGate.tsx");

/**
 * /login opens on Log in. It used to open on the sign-up form, so a returning
 * visitor landed on a registration screen and had to notice a tab — and
 * password recovery lives under the password on the Log in tab, so that was a
 * screen further away than it looked.
 */

describe("the page called log in opens on log in", () => {
  it("the page says so outright", () => {
    assert.match(PAGE, /initialMode="login"/);
  });

  it("the form takes it as a prop rather than hardcoding either answer", () => {
    assert.match(FORM, /initialMode\?: "signup" \| "login"/);
    assert.match(FORM, /useState<"signup" \| "login" \| "verify" \| "forgot" \| "reset">\(initialMode\)/);
  });

  it("signing up is still one tap away, not removed", () => {
    assert.match(FORM, /setMode\("signup"\)/);
  });
});

describe("the sign-in gate is a different situation and keeps its own answer", () => {
  it("it does not ask for the log-in tab", () => {
    // The gate appears when somebody without an account tries to save
    // something, where creating one is the likelier next step.
    assert.doesNotMatch(GATE, /initialMode/);
  });

  it("so the default stays sign-up for everyone who does not ask", () => {
    assert.match(FORM, /initialMode = "signup"/);
  });
});
