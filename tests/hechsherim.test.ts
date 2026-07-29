import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { describeHechsher, hechsherLabel, matchHechsher, UNVERIFIED } from "../data/hechsherim";
import { hechsherOf } from "../lib/use-hechsherim";

// A hechsher is a claim about kashrus. The rule this file exists to hold is
// that the site never makes that claim on its own: what a map tag says and
// what somebody actually checked are different things, and a traveler must be
// able to tell them apart at a glance.

describe("what the badge says", () => {
  test("nothing known reads unverified", () => {
    assert.equal(hechsherLabel(UNVERIFIED), "Unverified");
  });

  test("a reported hechsher still reads unverified", () => {
    const label = hechsherLabel({ state: "reported", hechsherId: "ou", source: "OpenStreetMap" });
    assert.match(label, /unverified/i);
    // The name is still shown — the traveler is better off knowing what to
    // look for — but never on its own, which would read as confirmation.
    assert.match(label, /Orthodox Union/);
  });

  test("a confirmed hechsher reads as itself, with no caveat", () => {
    const label = hechsherLabel({ state: "certified", hechsherId: "badatz-eda", source: "Saw the teudah" });
    assert.equal(label, "Badatz Eda HaChareidis");
  });

  test("confirmed-as-none is said plainly rather than left blank", () => {
    assert.equal(hechsherLabel({ state: "none", source: "Asked the manager" }), "No hechsher");
  });

  test("the spoken description tells a reported one from a confirmed one", () => {
    assert.match(describeHechsher({ state: "reported", hechsherId: "ou", source: "OpenStreetMap" }), /nobody here has confirmed/i);
    assert.match(describeHechsher({ state: "certified", hechsherId: "ou" }), /^Confirmed/);
    assert.match(describeHechsher(UNVERIFIED), /check before you eat/i);
  });
});

describe("reading one place's hechsher", () => {
  const place = { id: "node/1", reportedHechsher: "OU" };

  test("a place with nothing on it is unverified", () => {
    assert.equal(hechsherOf({}, { id: "node/9" }).state, "unverified");
  });

  test("a map tag comes back as reported, credited to OpenStreetMap", () => {
    const status = hechsherOf({}, place);
    assert.equal(status.state, "reported");
    assert.equal(status.source, "OpenStreetMap");
    assert.equal(status.hechsherId, "ou");
  });

  test("what the owner confirmed always beats the map tag", () => {
    const confirmed = { "node/1": { state: "none" as const, source: "Spoke to the owner" } };
    assert.equal(hechsherOf(confirmed, place).state, "none");
  });
});

describe("naming an agency from free text", () => {
  test("finds the agency a map tag names", () => {
    assert.equal(matchHechsher("Badatz Eda HaChareidis")?.id, "badatz-eda");
    assert.equal(matchHechsher("star-k")?.id, "star-k");
    assert.equal(matchHechsher("Certified by the London Beth Din")?.id, "klbd");
  });

  test("leaves text it does not recognise alone rather than guessing", () => {
    assert.equal(matchHechsher("Rav Shmuel's hashgocho"), undefined);
    assert.equal(matchHechsher(""), undefined);
    assert.equal(matchHechsher(undefined), undefined);
  });

  test("does not match a two-letter mark inside an unrelated word", () => {
    // "ou" appears in half the words in English; matching it loosely would
    // put an OU on a place nobody said was OU.
    assert.equal(matchHechsher("famous soup house"), undefined);
  });
});
