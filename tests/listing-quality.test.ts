import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanListingName, notABusinessReason, withoutScrapedJunk } from "@/data/listing-quality";
import { kosherEateries } from "@/data/kosher-eateries";

describe("page furniture is not a kosher restaurant", () => {
  // Every one of these was live in the published directory, each wrapped in a
  // generated sentence claiming a named certifier lists it as kosher.
  const WAS_LIVE = [
    "Need Help?",
    "Join Our Newsletter",
    "Latest Tours",
    "Contact Us",
    "Close",
    "Please allow up to",
    '0 " > {{sub_cato.name}}',
  ];

  for (const name of WAS_LIVE) {
    it(`refuses ${JSON.stringify(name)}`, () => {
      assert.ok(notABusinessReason(name), `${name} should have been caught`);
    });
  }

  it("refuses a name that is markup rather than words", () => {
    assert.ok(notABusinessReason('64" height="64" src="https://example.com/x.jpg'));
    assert.ok(notABusinessReason("{{ item.name }}"));
  });

  it("refuses something too short to be a name", () => {
    assert.ok(notABusinessReason("X"));
    assert.ok(notABusinessReason("  "));
  });
});

describe("a real business is never mistaken for furniture", () => {
  // The expensive failure: a hidden real restaurant is one nobody discovers.
  // Every name here is a real listing in this site's own data.
  const REAL = [
    "Home Sweet Challah",
    "The Milky Way",
    "The Upper Crust",
    "The Cheese Store",
    "Glatt Miami",
    "Kosher market",
    "Close to Home Catering",
    "Menucha Bakery",
    "Sharegold Deli",
    "More Than Bagels",
    "Bagel Boss (Miami Beach)",
  ];

  for (const name of REAL) {
    it(`keeps ${JSON.stringify(name)}`, () => {
      assert.equal(notABusinessReason(name), null);
    });
  }

  it("a generic word is furniture only when it is the WHOLE name", () => {
    assert.ok(notABusinessReason("Close"));
    assert.equal(notABusinessReason("Close to Home Catering"), null);
    assert.ok(notABusinessReason("Home"));
    assert.equal(notABusinessReason("Home Sweet Challah"), null);
  });

  it("trailing punctuation does not let furniture through", () => {
    assert.ok(notABusinessReason("Close."));
    assert.ok(notABusinessReason("Need Help?"));
    assert.ok(notABusinessReason("Menu:"));
  });
});

describe("a scraped name is shown as words, not entities", () => {
  it("decodes what this data actually carries", () => {
    assert.equal(cleanListingName("IGA Cote St Luc &#8211; Kosher Counters"), "IGA Cote St Luc – Kosher Counters");
    assert.equal(cleanListingName("The Hot Spot BBQ &#038; Grill"), "The Hot Spot BBQ & Grill");
    assert.equal(cleanListingName("Westin Galleria &amp; Oaks"), "Westin Galleria & Oaks");
  });

  it("leaves a clean name exactly as it is", () => {
    assert.equal(cleanListingName("Dinitz Kosher Restaurant"), "Dinitz Kosher Restaurant");
  });

  it("collapses the whitespace an entity leaves behind", () => {
    assert.equal(cleanListingName("Bagel&nbsp;&nbsp;Boss"), "Bagel Boss");
  });
});

describe("the filter keeps the rest of the record intact", () => {
  it("drops junk, cleans names, and passes clean rows through untouched", () => {
    const before = [
      { name: "Need Help?", city: "Bangkok" },
      { name: "IGA &#038; Sons", city: "Montreal" },
      { name: "Dinitz Kosher Restaurant", city: "Prague" },
    ];
    const after = withoutScrapedJunk(before);
    assert.deepEqual(after, [
      { name: "IGA & Sons", city: "Montreal" },
      { name: "Dinitz Kosher Restaurant", city: "Prague" },
    ]);
    // A row needing no change is the same object, not a copy.
    assert.equal(after[1], before[2]);
  });
});

describe("nothing junk reaches the public kosher food finder", () => {
  it("the published list is clean, and still large", () => {
    const junk = kosherEateries.filter((e) => notABusinessReason(e.name));
    assert.deepEqual(junk.map((e) => e.name), []);
    assert.ok(kosherEateries.length > 1400, `only ${kosherEateries.length} listings — the filter took too much`);
  });

  it("no published name still carries an HTML entity", () => {
    const raw = kosherEateries.filter((e) => /&#\d+;|&amp;|&quot;|&nbsp;/.test(e.name));
    assert.deepEqual(raw.map((e) => e.name), []);
  });
});
