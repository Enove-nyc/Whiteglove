import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * THE OLD COMPANY NAME IS DRAWN INTO /logo.png.
 *
 * The artwork reads "White Glove Itineraries". That cannot be corrected by
 * changing an alt attribute or a caption, because the words are part of the
 * picture — so every place that rendered it was publishing a name this
 * business no longer uses. It was on the cover of the document a client is
 * handed, in the header of every page of that document, at the top of every
 * transactional email, and on the card that appears whenever anybody shares
 * the site.
 *
 * The footer solved this same problem long ago, and the fix is its fix
 * everywhere: the hand is ink on transparent and carries no words, so the name
 * is set beside it as text.
 *
 * The file itself stays. It is somebody's original artwork and deleting it is
 * not this change's business; what matters is that nothing renders it.
 */
const WORDMARK = /["'`]\/logo\.png["'`]|\$\{origin\}\/logo\.png/;

describe("nothing renders the wordmark with the old name", () => {
  for (const path of [
    "components/PrintableItinerary.tsx",
    "components/BusinessBrandPanel.tsx",
    "lib/email-template.ts",
    "lib/seo.ts",
  ]) {
    it(`${path} does not`, () => {
      assert.doesNotMatch(readFileSync(path, "utf8"), WORDMARK);
    });
  }
});

describe("what each of them shows instead", () => {
  it("PUTS THE NAME ON THE PRINTED COVER AS WORDS", () => {
    // This is the page a client opens first. A cover with no name at all would
    // be a worse answer than the wrong one.
    const print = readFileSync("components/PrintableItinerary.tsx", "utf8");
    assert.match(print, /logo-hand-navy\.png/);
    assert.match(print, /White Glove<\/p>/);
    // The sub-line names whichever site actually produced the document — see
    // tests/two-brands-print.test.ts for which text renders for which brand.
    assert.match(print, /"Kosher Travel"/);
  });

  it("keeps the Business preview showing what the real cover shows", () => {
    // The preview's whole claim is that it is the real thing. If it drifts,
    // it is a picture of a document that does not exist.
    const panel = readFileSync("components/BusinessBrandPanel.tsx", "utf8");
    assert.match(panel, /logo-hand-navy\.png/);
    assert.match(panel, /White Glove\s*\n?\s*<\/p>/);
    assert.match(panel, /Kosher Travel\s*\n?\s*<\/p>/);
  });

  it("SIGNS EMAILS WITH A NAME THAT SURVIVES BLOCKED IMAGES", () => {
    // Most clients block pictures by default. A crest alone then says nothing
    // at all about who wrote; the name as text still does.
    const email = readFileSync("lib/email-template.ts", "utf8");
    assert.match(email, /logo-hand-navy\.png/);
    assert.match(email, />White Glove<\/div>/);
    assert.match(email, /Kosher Travel<\/div>/);
    // The mark is decoration beside a name that is already there.
    assert.match(email, /<img src="\$\{escapeEmailHtml\(crest\)\}" alt=""/);
  });

  it("shares a card with no words rather than the wrong ones", () => {
    const seo = readFileSync("lib/seo.ts", "utf8");
    assert.match(seo, /url: "\/logo-hand-navy\.png"/);
    // The dimensions must be the mark's own, or the card is stretched.
    assert.match(seo, /width: 355, height: 460/);
  });
});

describe("a Business putting its own name on the cover", () => {
  const PANEL = readFileSync("components/BusinessBrandPanel.tsx", "utf8");

  it("TURNS THE SWITCH ON WHEN A NAME OR A LOGO IS GIVEN", () => {
    // The switch decides whether the cover carries the business's own name,
    // and it starts off. So somebody typed their name, chose their logo,
    // watched the preview go on showing the White Glove cover, and could not
    // tell whether the preview was broken or they were. Filling either field
    // is unambiguously asking for it.
    assert.match(PANEL, /if \(e\.target\.value\.trim\(\)\) turnOwnBrandOn\(\)/);
    const picked = PANEL.slice(PANEL.indexOf("function pickLogo"));
    assert.match(picked.slice(0, 900), /turnOwnBrandOn\(\)/, "choosing a logo must turn it on too");
  });

  it("NEVER TURNS IT OFF BY ITSELF", () => {
    // Quietly taking a business's name off its own itineraries is not a thing
    // this screen may do. Off is an explicit act, and only the checkbox does it.
    const offs = PANEL.match(/setEnabled\(([^)]*)\)/g) ?? [];
    for (const call of offs) {
      assert.ok(
        /setEnabled\(true\)/.test(call) || /setEnabled\(e\.target\.checked\)/.test(call),
        `something sets enabled another way: ${call}`,
      );
    }
  });

  it("says so when the switch is off and there is something to show", () => {
    // The one case where the preview is right and looks wrong.
    assert.match(PANEL, /is off, so this is what prints/);
    assert.match(PANEL, /!enabled && \(name\.trim\(\) \|\| logoUrl\)/);
  });
});
