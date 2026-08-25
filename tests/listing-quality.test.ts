import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanListingName, notABusinessReason, phoneInAddress, trimScrapedAddress, withoutScrapedJunk } from "@/data/listing-quality";
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
    "Cookielada",
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

  it("a phrase rule never eats a longer word that starts the same way", () => {
    // "Cookielada" is a real bakery. It arrived in the directory after this
    // filter shipped, and a bare "cookie" prefix rule dropped it on sight.
    assert.equal(notABusinessReason("Cookielada"), null);
    assert.equal(notABusinessReason("Contacts Deli"), null);
    assert.equal(notABusinessReason("Termsina Cafe"), null);
  });

  it("a cookie banner is named outright, so a bakery is not caught by it", () => {
    // A banner is always "Cookie policy" / "Cookie notice" / "Cookie
    // settings" — never a bare word somebody would name a shop.
    assert.equal(notABusinessReason("Cookie Corner"), null);
    assert.equal(notABusinessReason("Cookie Jar Bakery"), null);
    assert.equal(notABusinessReason("Cookies"), null);
    assert.ok(notABusinessReason("Cookie policy"));
    assert.ok(notABusinessReason("Cookie Settings"));
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

describe("an address stops where the address stops", () => {
  it("cuts the opening hours the harvester ran on into", () => {
    assert.equal(
      trimScrapedAddress("9806 Hillcroft Ave. Houston, TX 77096 Hours: Sunday-Thursday 11am-8pm Friday 9am-4pm"),
      "9806 Hillcroft Ave. Houston, TX 77096",
    );
  });

  it("cuts a website, and the blurb that followed it", () => {
    assert.equal(
      trimScrapedAddress("2355 Blue Bonnet Blvd Houston Texas 77030 Website: http://x.com, Houston, TX"),
      "2355 Blue Bonnet Blvd Houston Texas 77030",
    );
  });

  it("leaves a clean address exactly as it is", () => {
    const clean = "Via del Portico d\u2019Ottavia 57, Rome";
    assert.equal(trimScrapedAddress(clean), clean);
    assert.equal(trimScrapedAddress("4747 Collins Ave, Miami Beach, FL 33140"), "4747 Collins Ave, Miami Beach, FL 33140");
  });

  it("returns nothing rather than a fragment somebody would try to navigate by", () => {
    // This record really began "0823 Website: …" — the tail of a phone number
    // the harvester started part-way through. "0823" is worse than no address.
    assert.equal(trimScrapedAddress("0823 Website: http://www.thegrillecatering.com Treat your family"), "");
    assert.equal(trimScrapedAddress("77096"), "");
    assert.equal(trimScrapedAddress(""), "");
  });

  it("a name that ran on into its own labels is cut too", () => {
    assert.equal(cleanListingName("Dino\u2019s Mediterranean Cuisine Phone: 832-667-8592 Address:"), "Dino\u2019s Mediterranean Cuisine");
  });
});

describe("a phone number in the address field is a phone number", () => {
  it("finds the ones this data actually has", () => {
    assert.equal(phoneInAddress("020 3667 1200, United Kingdom"), "020 3667 1200");
    assert.equal(phoneInAddress("07582 080521, United Kingdom"), "07582 080521");
    assert.equal(phoneInAddress("214-641-0693, Dallas, TX, United States"), "214-641-0693");
    assert.equal(phoneInAddress("+44 20 8202 2327"), "+44 20 8202 2327");
  });

  it("NEVER mistakes a street address that opens with a house number", () => {
    // The expensive direction. A looser rule flagged 199 of these — every US
    // address begins with a number — and blanking them would have deleted the
    // one useful field on a couple of hundred good listings.
    for (const real of [
      "1666 79th Street Causeway, Suite 102, North Bay Village, FL 33141",
      "18110 Collins Ave, Sunny Isles Beach, FL 33160",
      "4747 Collins Ave, Miami Beach, FL 33140",
      "28 Kazinczy utca, Budapest, Hungary",
      "ul. Grzybowska 2, 1st floor, 00-131 Warszawa",
    ]) {
      assert.equal(phoneInAddress(real), null, `${real} is a street address, not a phone number`);
    }
  });

  it("ignores anything too short to be a number worth calling", () => {
    assert.equal(phoneInAddress("33140"), null);
    assert.equal(phoneInAddress("77096, Houston"), null);
    assert.equal(phoneInAddress(""), null);
    assert.equal(phoneInAddress(undefined), null);
  });

  it("moves it to the phone field and clears the address", () => {
    const [row] = withoutScrapedJunk([
      { name: "Cohens Bakery", address: "020 3667 1200, United Kingdom" } as { name: string; address?: string; phone?: string },
    ]);
    assert.equal(row.phone, "020 3667 1200");
    assert.equal(row.address, undefined);
  });

  it("never overwrites a number the listing already had", () => {
    // The address is the doubtful copy, not the authority.
    const [row] = withoutScrapedJunk([
      { name: "Somewhere", address: "020 3667 1200, United Kingdom", phone: "020 1111 2222" },
    ]);
    assert.equal(row.phone, "020 1111 2222");
    assert.equal(row.address, "020 3667 1200, United Kingdom");
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

  it("no published address has a page's opening hours or website glued to it", () => {
    const RUN_ON = /\s(?:Website|Hours|Tel|Phone|Email|Fax|Open|Kashrut|Supervision)\s*:/i;
    const bad = kosherEateries.filter((e) => RUN_ON.test(e.address || ""));
    assert.deepEqual(bad.map((e) => `${e.name}: ${e.address}`), []);
  });

  it("no published address is a phone number, and each became a callable one", () => {
    assert.deepEqual(kosherEateries.filter((e) => phoneInAddress(e.address)).map((e) => e.name), []);
    assert.ok(kosherEateries.filter((e) => e.phone).length >= 5, "the numbers went nowhere");
  });

  it("no listing was dropped, and every missing address is missing for a known reason", () => {
    assert.ok(kosherEateries.length > 1400);
    const missing = kosherEateries.filter((e) => !e.address);
    // Two reasons, both deliberate: the source published a phone number
    // instead of a street (it is now a callable number), or what was there
    // was a fragment of a phone number nobody could navigate by.
    const unexplained = missing.filter((e) => !e.phone && e.name !== "The Grille Catering");
    assert.deepEqual(unexplained.map((e) => e.name), [], "a listing lost its address for no recorded reason");
    assert.ok(missing.length <= 8, `${missing.length} listings have no address — more than the known cases`);
  });
});
