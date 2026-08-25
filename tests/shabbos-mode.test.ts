import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fridayOf, isEmpty, MAX_FOOD, samePlaceName, shabbosIn } from "@/data/shabbos-mode";

const listing = (id: string, name: string, city: string, country = "Poland") => ({
  id,
  name,
  city,
  country,
  address: null,
  hours: null,
  phone: null,
  website: null,
  href: `/x/${id}`,
});

const food = (id: string, name: string, kind: string, city: string, country = "Poland") => ({
  ...listing(id, name, city, country),
  kind,
});

const eruv = (id: string, name: string, city: string, country = "Poland") => ({
  id,
  name,
  city,
  country,
  covers: null,
  sourceUrl: "https://example.org",
  mapUrl: null,
});

const empty = { shuls: [], mikvaos: [], eruvin: [], food: [] };

describe("a place name matches the way a person reads it", () => {
  it("ignores accents and case", () => {
    assert.ok(samePlaceName("Kraków", "Krakow"));
    assert.ok(samePlaceName("TEL AVIV", "Tel Aviv"));
    assert.ok(samePlaceName("Bodrogkeresztúr", "bodrogkeresztur"));
  });

  it("does not guess at near-misses — a shul in the wrong city is the bad outcome", () => {
    assert.ok(!samePlaceName("Rome", "Roma"));
    assert.ok(!samePlaceName("London", "New London"));
  });
});

describe("gathering one destination's Shabbos", () => {
  it("takes every town the destination covers, not just the first", () => {
    const place = shabbosIn({
      ...empty,
      name: "The Tatras",
      cities: ["Zakopane", "Nowy Targ"],
      country: "Poland",
      shuls: [listing("a", "Alpha", "Zakopane"), listing("b", "Beta", "Nowy Targ")],
    });
    assert.deepEqual(place.shuls.map((s) => s.name), ["Alpha", "Beta"]);
  });

  it("never reaches into another country with the same town name", () => {
    const place = shabbosIn({
      ...empty,
      name: "London",
      cities: ["London"],
      country: "United Kingdom",
      shuls: [listing("a", "Right", "London", "United Kingdom"), listing("b", "Wrong", "London", "Canada")],
    });
    assert.deepEqual(place.shuls.map((s) => s.name), ["Right"]);
  });

  it("puts food in the order a Friday afternoon needs it", () => {
    const place = shabbosIn({
      ...empty,
      name: "Kraków",
      cities: ["Kraków"],
      country: "Poland",
      food: [
        food("1", "Zeta Restaurant", "Restaurant", "Kraków"),
        food("2", "Alpha Bakery", "Bakery", "Kraków"),
        food("3", "Beta Grocery", "Grocery", "Kraków"),
        food("4", "Gamma Butcher", "Butcher", "Kraków"),
      ],
    });
    assert.deepEqual(place.foodBeforeShabbos.map((f) => f.kind), ["Bakery", "Grocery", "Butcher", "Restaurant"]);
  });

  it("sorts by name inside a kind, so the order is not the file's order", () => {
    const place = shabbosIn({
      ...empty,
      name: "Kraków",
      cities: ["Kraków"],
      country: "Poland",
      food: [food("1", "Zayin Bakery", "Bakery", "Kraków"), food("2", "Aleph Bakery", "Bakery", "Kraków")],
    });
    assert.deepEqual(place.foodBeforeShabbos.map((f) => f.name), ["Aleph Bakery", "Zayin Bakery"]);
  });

  it("caps the food list and counts what is left", () => {
    // London really has 116 on record. A list of 116 is the kosher food
    // finder with a different heading, not an answer to "where do I buy".
    const many = Array.from({ length: MAX_FOOD + 20 }, (_, i) =>
      food(String(i), `Bakery ${String(i).padStart(3, "0")}`, "Bakery", "Kraków"),
    );
    const place = shabbosIn({ ...empty, name: "Kraków", cities: ["Kraków"], country: "Poland", food: many });
    assert.equal(place.foodBeforeShabbos.length, MAX_FOOD);
    assert.equal(place.moreFood, 20);
  });

  it("counts nothing left over when everything fits", () => {
    const place = shabbosIn({
      ...empty,
      name: "Kraków",
      cities: ["Kraków"],
      country: "Poland",
      food: [food("1", "One", "Bakery", "Kraków")],
    });
    assert.equal(place.moreFood, 0);
  });

  it("the cap keeps the most useful kinds, not the first dozen alphabetically", () => {
    const place = shabbosIn({
      ...empty,
      name: "Kraków",
      cities: ["Kraków"],
      country: "Poland",
      food: [
        ...Array.from({ length: MAX_FOOD }, (_, i) => food(`r${i}`, `Restaurant ${i}`, "Restaurant", "Kraków")),
        food("b", "The only bakery", "Bakery", "Kraków"),
      ],
    });
    assert.equal(place.foodBeforeShabbos[0].name, "The only bakery");
  });

  it("says plainly when it knows nothing, rather than showing empty headings", () => {
    const place = shabbosIn({ ...empty, name: "Nowhere", cities: ["Nowhere"], country: "Poland" });
    assert.ok(isEmpty(place));
  });

  it("is not empty when it has only an eruv", () => {
    const place = shabbosIn({
      ...empty,
      name: "Kraków",
      cities: ["Kraków"],
      country: "Poland",
      eruvin: [eruv("e", "The Kazimierz eruv", "Kraków")],
    });
    assert.ok(!isEmpty(place));
  });
});

describe("nothing is invented on the way through", () => {
  it("a listing with no published hours keeps none — no minyan time appears", () => {
    const place = shabbosIn({
      ...empty,
      name: "Kraków",
      cities: ["Kraków"],
      country: "Poland",
      shuls: [listing("a", "Remuh", "Kraków")],
    });
    assert.equal(place.shuls[0].hours, null);
  });

  it("the rows come through unchanged apart from order", () => {
    const row = listing("a", "Remuh", "Kraków");
    const place = shabbosIn({ ...empty, name: "Kraków", cities: ["Kraków"], country: "Poland", shuls: [row] });
    assert.equal(place.shuls[0], row);
  });
});

describe('"this Shabbos" means the one a traveller is asking about', () => {
  const on = (date: string) => fridayOf(new Date(`${date}T12:00:00Z`));

  it("looks forward to Friday from earlier in the week", () => {
    assert.equal(on("2026-08-23"), "2026-08-28"); // Sunday
    assert.equal(on("2026-08-27"), "2026-08-28"); // Thursday
  });

  it("is today when today is Friday", () => {
    assert.equal(on("2026-08-28"), "2026-08-28");
  });

  it("stays on the Shabbos in progress on Shabbos itself — havdalah, not next week", () => {
    assert.equal(on("2026-08-29"), "2026-08-28");
  });

  it("moves on from Sunday", () => {
    assert.equal(on("2026-08-30"), "2026-09-04");
  });

  it("crosses a month and a year end", () => {
    assert.equal(on("2026-12-31"), "2027-01-01");
  });
});
