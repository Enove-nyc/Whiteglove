import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { allHechsherim, getHechsher, HECHSHERIM, matchHechsher } from "../data/hechsherim";
import { agencyIdFrom, assertUsableLogo } from "../lib/hechsher-store";

// No list of certifying bodies is ever finished — a town has its own vaad, a
// rov gives his own hechsher — so the owner can add one and can put a picture
// of the mark on any of them. These are the two places that can go wrong: a
// custom agency failing to reach the badge, and an uploaded file being
// something other than a picture.

describe("adding a hechsher to the list", () => {
  test("an added one is offered alongside the built-in ones", () => {
    const all = allHechsherim([{ id: "vaad-golders-green", name: "Vaad of Golders Green", mark: "VGG", region: "London" }]);
    assert.equal(all.length, HECHSHERIM.length + 1);
    assert.equal(getHechsher("vaad-golders-green", all)?.name, "Vaad of Golders Green");
    // …and the built-in list is untouched.
    assert.equal(getHechsher("vaad-golders-green"), undefined);
  });

  test("a mark is worked out when none is typed", () => {
    const [added] = allHechsherim([{ id: "x", name: "Kehal Adas Yereim" }]).slice(-1);
    assert.equal(added.mark, "KEH");
  });

  test("an entry sharing a built-in id changes it rather than duplicating it", () => {
    const all = allHechsherim([{ id: "ou", logo: "data:image/png;base64,AAAA" }]);
    assert.equal(all.length, HECHSHERIM.length);
    const ou = getHechsher("ou", all)!;
    assert.equal(ou.name, "Orthodox Union", "the built-in name must survive a logo-only overlay");
    assert.equal(ou.logo, "data:image/png;base64,AAAA");
  });

  test("a blank field never wipes the built-in wording", () => {
    const ou = getHechsher("ou", allHechsherim([{ id: "ou", name: "", region: "" }]))!;
    assert.equal(ou.name, "Orthodox Union");
    assert.equal(ou.region, "United States, international");
  });

  test("an added one can be matched from a map tag by its spellings", () => {
    const all = allHechsherim([{ id: "vaad-gg", name: "Vaad of Golders Green", aliases: ["golders green vaad"] }]);
    assert.equal(matchHechsher("Golders Green Vaad", all)?.id, "vaad-gg");
    assert.equal(matchHechsher("Golders Green Vaad"), undefined, "the built-in list must not match it");
  });

  test("an id is made from the name", () => {
    assert.equal(agencyIdFrom("Vaad HaKashrus of Golders Green"), "vaad-hakashrus-of-golders-green");
    assert.equal(agencyIdFrom("  Badatz — Eda!  "), "badatz-eda");
  });
});

describe("what may be uploaded as a mark", () => {
  const png = (bytes: number) => `data:image/png;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

  test("a small PNG is fine", () => {
    assert.equal(assertUsableLogo(png(2000)).ok, true);
  });

  test("an SVG is refused, and says why in a way that can be acted on", () => {
    const result = assertUsableLogo('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
    assert.equal(result.ok, false);
    assert.match((result as { message: string }).message, /save it as a PNG/i);
  });

  test("a script pretending to be a picture is refused", () => {
    assert.equal(assertUsableLogo("data:text/html;base64,PHNjcmlwdD4=").ok, false);
    assert.equal(assertUsableLogo("javascript:alert(1)").ok, false);
    assert.equal(assertUsableLogo("https://example.com/logo.png").ok, false);
  });

  test("a photograph nobody resized is refused", () => {
    const result = assertUsableLogo(png(200 * 1024));
    assert.equal(result.ok, false);
    assert.match((result as { message: string }).message, /too big/i);
  });
});
