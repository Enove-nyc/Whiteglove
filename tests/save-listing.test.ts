import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (p: string) => readFileSync(p, "utf8");
const BUTTON = read("components/SaveListingButton.tsx");
const HOOK = read("components/useSavedPlaces.tsx");

const COVERED: Array<[string, string]> = [
  ["components/EateryDirectory.tsx", "restaurant"],
  ["components/ChabadDirectory.tsx", "shul"],
  ["components/KosherStayDirectory.tsx", "place to stay"],
  ["components/AttractionDirectory.tsx", "attraction"],
];

describe("the things people collect can now be saved", () => {
  it("every directory that had no way to save has one", () => {
    // Destinations, towns and batei hachaim already could. These are the rows
    // somebody is actually gathering while they plan, and they could not.
    for (const [path, what] of COVERED) {
      const source = read(path);
      assert.match(source, /<SaveListingButton/, path);
      assert.ok(source.includes(`what="${what}"`), `${path} does not say what it is saving`);
    }
  });

  it("each saved place carries an id nothing else can collide with", () => {
    // A restaurant and a shul in the same town must not share an id, or
    // unsaving one would unsave the other.
    const prefixes = COVERED.map(([path]) => {
      const match = /id: `([a-z-]+)-\$\{/.exec(read(path));
      return match?.[1] ?? "";
    });
    assert.ok(prefixes.every(Boolean), "a directory saves a place with no prefixed id");
    assert.equal(new Set(prefixes).size, prefixes.length, "two directories use the same id prefix");
  });
});

describe("the account is asked for at the moment it is worth something", () => {
  it("uses the existing prompt rather than a new one", () => {
    assert.match(BUTTON, /useRequireSignIn/);
    assert.match(BUTTON, /from "@\/components\/SignInGate"/);
  });

  it("says WHAT the account is for, in the words of the thing being saved", () => {
    // "Sign in to save this restaurant" tells somebody what they get. A bare
    // "Sign in" asks them to guess.
    assert.match(BUTTON, /`Sign in to save this \$\{what\}`/);
  });

  it("completes the save the person asked for, rather than forgetting it", () => {
    assert.match(BUTTON, /requireSignIn\(\(\) => \{/);
    assert.match(BUTTON, /void toggle\(place\)/);
  });

  it("puts no wall in front of browsing", () => {
    // The button is the only thing that mentions signing in. No page-level
    // gate, no banner on arrival.
    for (const [path] of COVERED) {
      assert.ok(!/requireSignedIn|redirect\("\/login/.test(read(path)), `${path} gates browsing`);
    }
  });
});

describe("saving is account-first, because that is what it is for", () => {
  it("reads the account's own list, once for a whole page", () => {
    // A hundred rows must not be a hundred requests.
    assert.match(HOOK, /let inFlight: Promise<void> \| null = null;/);
    assert.match(HOOK, /if \(inFlight\) return inFlight;/);
    assert.match(HOOK, /\/api\/account\/me/);
  });

  it("writes to the account, not to this browser", () => {
    // The older buttons write localStorage first and sync quietly, which is why
    // a place saved on a phone was missing from the laptop.
    assert.match(HOOK, /\/api\/account\/places/);
    // Read past the header comment, which explains that older buttons do this
    // rather than doing it.
    const hookCode = HOOK.slice(HOOK.indexOf("let cache"));
    assert.ok(!hookCode.includes("localStorage"), "the new save path writes to the browser");
    assert.ok(!BUTTON.slice(BUTTON.indexOf("export function")).includes("localStorage"), "the button writes to the browser");
  });

  it("PUTS THE HEART BACK when the server refuses", () => {
    // A heart that stays filled after a failed save is a lie the traveller
    // discovers on another device.
    const toggle = HOOK.slice(HOOK.indexOf("const toggle ="));
    assert.match(toggle, /const before = cache \?\? \[\];/);
    assert.match(toggle, /cache = before;/);
  });

  it("shows the outline until the list is actually known", () => {
    // Better than a heart that fills in a moment after the page settles.
    assert.match(BUTTON, /ready && saved \? "heart-filled" : "heart"/);
  });
});

describe("the state is not carried by colour alone", () => {
  it("says saved in the accessible name and in aria-pressed", () => {
    assert.match(BUTTON, /aria-pressed=\{saved\}/);
    assert.match(BUTTON, /saved \? `Saved — remove this \$\{what\}` : `Save this \$\{what\}`/);
  });

  it("is a comfortable target on a phone", () => {
    assert.match(BUTTON, /min-h-11 min-w-11/);
  });
});
