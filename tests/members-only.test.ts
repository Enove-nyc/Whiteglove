import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { featureFor, GATED_FEATURES, promptFor, SIGN_IN_LABEL, signInTo } from "@/lib/members-only";

/**
 * Nothing is hidden from somebody who has not signed in.
 *
 * THIS EXISTS BECAUSE THE ITINERARY PLANNER AND MY ROUTE WERE INVISIBLE. Both
 * sat inside the signed-in branch of the menu, so a visitor who had not signed
 * in never learned either existed — and therefore had no reason to make an
 * account. A feature nobody can see is a feature nobody asks for.
 */

const NAVBAR = readFileSync("components/Navbar.tsx", "utf8");
const LINK = readFileSync("components/MembersOnlyLink.tsx", "utf8");

describe("the buttons are there whoever is looking", () => {
  it("does not put the planner or My Route behind a signed-in check", () => {
    // THE ONE THAT MATTERS. If either of these addresses appears inside the
    // `signedIn ?` branch again, it has gone back into hiding.
    const branch = NAVBAR.slice(NAVBAR.indexOf("{signedIn ? ("), NAVBAR.indexOf("Sign out") + 200);
    for (const feature of GATED_FEATURES) {
      assert.ok(!branch.includes(feature.href), `${feature.href} is back inside the signed-in branch`);
    }
  });

  it("renders every gated feature from the one list", () => {
    // Hand-written copies are how one of them comes back and the other does
    // not.
    assert.match(NAVBAR, /GATED_FEATURES\.map/);
  });

  it("covers the two the owner named", () => {
    assert.deepEqual(GATED_FEATURES.map((f) => f.href), ["/itinerary", "/my-route"]);
    assert.equal(featureFor("itinerary")?.label, "Itinerary planner");
  });
});

describe("what the note says is true", () => {
  it("DOES NOT CLAIM AN ACCOUNT IS NEEDED when it is not", () => {
    // Both of these work signed out, keeping everything in the browser. "You
    // need to be logged in" would be false, and would turn away the exact
    // person it is meant to attract.
    for (const feature of GATED_FEATURES) {
      if (feature.needsAccount) continue;
      const prompt = promptFor(feature);
      assert.doesNotMatch(prompt.title, /need to be signed in|must sign in|log in/i, feature.key);
      assert.doesNotMatch(prompt.body.join(" "), /you (need|have) to (be )?(sign|log)/i, feature.key);
    }
  });

  it("offers to carry on without an account, because that works", () => {
    for (const feature of GATED_FEATURES) {
      const prompt = promptFor(feature);
      assert.equal(prompt.canContinue, !feature.needsAccount, feature.key);
      if (prompt.canContinue) assert.ok(prompt.continueLabel.length > 4);
    }
  });

  it("says what is lost without one, so signing in has a reason", () => {
    for (const feature of GATED_FEATURES) {
      if (feature.needsAccount) continue;
      assert.match(promptFor(feature).body[1], /this browser/i, feature.key);
    }
  });

  it("is blunt when something really cannot work signed out", () => {
    const prompt = promptFor({
      key: "x",
      label: "Something",
      href: "/x",
      needsAccount: true,
      what: "A thing.",
      accountAdds: "",
    });
    assert.match(prompt.title, /need to be signed in/i);
    assert.equal(prompt.canContinue, false);
  });

  it("always says what the feature is, first", () => {
    for (const feature of GATED_FEATURES) {
      assert.equal(promptFor(feature).body[0], feature.what);
      assert.ok(feature.what.length > 40, feature.key);
    }
  });
});

describe("signing in finishes the journey they started", () => {
  it("comes back to the feature, not to where they were standing", () => {
    // They pressed a button asking to go somewhere. Returning them to the page
    // they started on makes them press it again.
    assert.equal(signInTo(GATED_FEATURES[0]), "/login?next=%2Fitinerary");
  });

  it("offers one door, because there is only one", () => {
    // /login opens on "Sign up" with a toggle. A second button labelled
    // "Create an account" would go to the same place.
    assert.match(SIGN_IN_LABEL, /create an account/i);
    assert.equal((LINK.match(/signInTo\(feature\)/g) ?? []).length, 1);
  });
});

describe("it still behaves like a link", () => {
  it("keeps a real href, so open-in-new-tab works", () => {
    assert.match(LINK, /href=\{feature\.href\}/);
  });

  it("leaves a modified click alone", () => {
    // Ctrl-click means "new tab". Swallowing that to show a note is worse than
    // the note is worth.
    assert.match(LINK, /metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/);
  });

  it("does not hide while it is still working out who is looking", () => {
    // Rendering nothing until the answer arrives is how these came to be
    // invisible in the first place. Only an answer of FALSE opens the note.
    assert.match(LINK, /signedIn === false/);
    assert.ok(!/signedIn === null/.test(LINK), "it goes quiet before it knows who is looking");
  });
});
