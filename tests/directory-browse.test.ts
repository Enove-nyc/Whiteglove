import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countriesIn, filterDirectory, lettersIn, NO_FILTERS, type DirectoryEntry } from "@/lib/directory-browse";

// 297 cards, rendered all at once, with a text box that replaced the page
// rather than narrowing it. These are the rules the replacement runs on.

const entry = (over: Partial<DirectoryEntry> & { n: string }): DirectoryEntry => ({
  s: over.n.toLowerCase(),
  y: "",
  c: "Poland",
  k: "destination",
  h: `/destinations/${over.n.toLowerCase()}`,
  q: `${over.n} poland`.toLowerCase(),
  v: 0,
  b: 0,
  f: { kosher: false, mikvah: false, stay: false, contact: false },
  ...over,
});

const names = (entries: DirectoryEntry[]) => entries.map((e) => e.n);

const SAMPLE: DirectoryEntry[] = [
  entry({ n: "Uman", c: "Ukraine", k: "guide", q: "uman ukraine rebbe nachman", v: 2, f: { kosher: true, mikvah: true, stay: false, contact: true } }),
  entry({ n: "Lizhensk", k: "guide", q: "lizhensk poland elimelech", v: 1, b: 0, f: { kosher: true, mikvah: false, stay: false, contact: false } }),
  entry({ n: "Kraków", k: "cemetery", q: "kraków poland remuh", b: 12 }),
  entry({ n: "Warsaw", q: "warsaw poland" }),
  entry({ n: "Belz", c: "Ukraine", q: "belz ukraine", b: 3, k: "cemetery" }),
];

describe("filtering the directory", () => {
  it("returns everything when nothing is asked", () => {
    assert.equal(filterDirectory(SAMPLE, NO_FILTERS).length, SAMPLE.length);
  });

  it("narrows by country, kind and letter", () => {
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, country: "Ukraine" })).sort(), ["Belz", "Uman"]);
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, kind: "guide" })).sort(), ["Lizhensk", "Uman"]);
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, letter: "W" })), ["Warsaw"]);
  });

  it("keeps the search AND the filters, instead of one replacing the other", () => {
    // The old page had a browsing mode and a results mode, so choosing a
    // country and then typing threw the country away.
    const result = filterDirectory(SAMPLE, { ...NO_FILTERS, country: "Ukraine", query: "belz" });
    assert.deepEqual(names(result), ["Belz"]);
  });

  it("treats several words as narrowing, not widening", () => {
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, query: "uman ukraine" })), ["Uman"]);
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, query: "uman poland" })), []);
  });

  it("combines the has-this filters with AND", () => {
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, needs: ["kosher"] })).sort(), ["Lizhensk", "Uman"]);
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, needs: ["kosher", "mikvah"] })), ["Uman"]);
  });

  it("shows only what has been checked when asked", () => {
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, verifiedOnly: true })).sort(), ["Lizhensk", "Uman"]);
  });

  it("sorts the way each order says", () => {
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, sort: "kevarim" }))[0], "Kraków");
    assert.deepEqual(names(filterDirectory(SAMPLE, { ...NO_FILTERS, sort: "checked" }))[0], "Uman");
    const az = names(filterDirectory(SAMPLE, { ...NO_FILTERS, sort: "az" }));
    assert.deepEqual(az, [...az].sort((a, b) => a.localeCompare(b)));
  });

  it("does not mutate the list it was given", () => {
    const before = names(SAMPLE);
    filterDirectory(SAMPLE, { ...NO_FILTERS, sort: "kevarim" });
    assert.deepEqual(names(SAMPLE), before);
  });
});

describe("the A–Z strip", () => {
  it("offers only letters something starts with", () => {
    // A letter that leads to an empty list is a dead control.
    assert.deepEqual(lettersIn(SAMPLE), ["B", "K", "L", "U", "W"]);
  });

  it("ignores a name that does not start with a latin letter", () => {
    assert.deepEqual(lettersIn([entry({ n: "אומאן" })]), []);
  });
});

describe("the country list", () => {
  it("counts each country and puts the commonest first", () => {
    assert.deepEqual(countriesIn(SAMPLE), [
      { value: "Poland", label: "Poland (3)" },
      { value: "Ukraine", label: "Ukraine (2)" },
    ]);
  });
});
