import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  demandReport,
  emptyAndUnvisited,
  emptyAndWanted,
  filledAndWanted,
  keverMissing,
  missingThings,
  townMissing,
  type Held,
} from "@/lib/demand";

/**
 * What people came looking for, set against what the site has.
 *
 * The completeness queue says 111 towns are empty and 141 batei hachaim have
 * no checked coordinate. That is honest and useless on its own: it says the
 * same thing about all of them, and sorted alphabetically the first
 * afternoon's work goes into towns nobody has ever opened.
 *
 * The rule that must hold: **zero visits is not a low score.** A page nobody
 * has opened since counting began has not been rejected — nothing is known
 * about it. Ranking it next to a page twenty people opened and found empty
 * would bury the one piece of real information on the screen.
 */

const held: Held[] = [
  { path: "/stops/bobov", title: "Bobov", kind: "town", filled: false, missing: "nothing published at all", editHref: "/admin/destinations?slug=bobov" },
  { path: "/stops/lizhensk", title: "Lizhensk", kind: "town", filled: true, missing: "", editHref: "/admin/destinations?slug=lizhensk" },
  { path: "/stops/nowhere", title: "Nowhere", kind: "town", filled: false, missing: "nothing published at all", editHref: "/admin/destinations?slug=nowhere" },
  { path: "/cemeteries/dynow", title: "Dynów", kind: "beis hachaim", filled: false, missing: "nobody on file to let you in", editHref: "/admin/kevarim?slug=dynow" },
];

const visited = [
  { path: "/stops/bobov", visits: 47 },
  { path: "/cemeteries/dynow", visits: 12 },
  { path: "/stops/lizhensk", visits: 90 },
];

describe("empty pages people keep opening", () => {
  it("ranks them by how many people opened them", () => {
    const gaps = emptyAndWanted(held, visited);
    assert.deepEqual(gaps.map((g) => g.title), ["Bobov", "Dynów"]);
    assert.equal(gaps[0].visits, 47);
  });

  it("leaves out one nobody has opened rather than ranking it last", () => {
    // Zero visits is not a low score — it is nothing known. Ranking it beside
    // a page twenty people opened and found empty would bury the one piece of
    // real information on the screen.
    assert.ok(!emptyAndWanted(held, visited).some((g) => g.title === "Nowhere"));
  });

  it("counts those separately, so the list is not mistaken for all of them", () => {
    assert.equal(emptyAndUnvisited(held, visited), 1);
  });

  it("never lists a page that has something on it", () => {
    assert.ok(!emptyAndWanted(held, visited).some((g) => g.title === "Lizhensk"));
  });

  it("carries what is missing and where to fix it", () => {
    const [first] = emptyAndWanted(held, visited);
    assert.equal(first.missing, "nothing published at all");
    assert.match(first.editHref, /^\/admin\//);
  });

  it("breaks a tie by name rather than by whatever order the store returned", () => {
    const tied: Held[] = [
      { path: "/a", title: "Zanz", kind: "town", filled: false, missing: "x", editHref: "/admin/a" },
      { path: "/b", title: "Apta", kind: "town", filled: false, missing: "x", editHref: "/admin/b" },
    ];
    const gaps = emptyAndWanted(tied, [{ path: "/a", visits: 5 }, { path: "/b", visits: 5 }]);
    assert.deepEqual(gaps.map((g) => g.title), ["Apta", "Zanz"]);
  });

  it("says nothing at all when nothing has been counted", () => {
    assert.deepEqual(emptyAndWanted(held, []), []);
    assert.equal(emptyAndUnvisited(held, []), 3, "all three empty ones are simply unknown");
  });
});

describe("the work that paid", () => {
  it("lists the filled pages people actually open", () => {
    const paying = filledAndWanted(held, visited);
    assert.deepEqual(paying.map((g) => g.title), ["Lizhensk"]);
    assert.equal(paying[0].visits, 90);
  });
});

describe("what people searched for and did not find", () => {
  it("ranks by how many people asked", () => {
    const missing = missingThings([
      { label: "kerestir", count: 3 },
      { label: "shinov", count: 11 },
    ]);
    assert.deepEqual(missing.map((m) => m.term), ["shinov", "kerestir"]);
    assert.equal(missing[0].times, 11);
  });

  it("hints at a person when the words give it away", () => {
    assert.equal(missingThings([{ label: "rebbe elimelech", count: 1 }])[0].guess, "a kever or a person");
    assert.equal(missingThings([{ label: "kever of the chozeh", count: 1 }])[0].guess, "a kever or a person");
  });

  it("hints at a town when the words are about a place", () => {
    assert.equal(missingThings([{ label: "kosher food in tarnow", count: 1 }])[0].guess, "a town");
    assert.equal(missingThings([{ label: "mikveh krakow", count: 1 }])[0].guess, "a town");
  });

  it("guesses nothing far more often than not, and says so", () => {
    // A guess is a hint for the owner's eye. Null is the honest answer for a
    // bare place name, which is most of them.
    for (const term of ["shinov", "sanz", "ulanow", "zolochiv"]) {
      assert.equal(missingThings([{ label: term, count: 1 }])[0].guess, null, term);
    }
  });

  it("does not match a word inside another word", () => {
    // "reb" inside "Rebrov" is not somebody looking for a rebbe.
    assert.equal(missingThings([{ label: "rebrov", count: 1 }])[0].guess, null);
  });

  it("keeps the list short enough to read", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ label: `term ${i}`, count: 60 - i }));
    assert.equal(missingThings(many).length, 25);
    assert.equal(missingThings(many, 5).length, 5);
  });
});

describe("the whole report", () => {
  const report = (over: Partial<Parameters<typeof demandReport>[0]> = {}) =>
    demandReport({ counting: true, held, visited, emptySearches: [{ label: "shinov", count: 4 }], ...over });

  it("leads with the pages to fill first", () => {
    assert.match(report().says, /2 pages people open still have nothing on them/);
  });

  it("says one page in the singular", () => {
    assert.match(report({ visited: [{ path: "/stops/bobov", visits: 47 }] }).says, /One page people open still has nothing on it/);
  });

  it("falls back to the searches when every visited page is filled", () => {
    const allFilled = held.map((h) => ({ ...h, filled: true }));
    assert.match(report({ held: allFilled }).says, /One thing was searched for and not found/);
  });

  it("says plainly that nothing is being counted", () => {
    const r = report({ counting: false });
    assert.match(r.says, /Nothing is being counted yet/);
    assert.equal(r.counting, false);
  });

  it("does not read as failure when there is genuinely nothing to report", () => {
    const r = report({ held: held.map((h) => ({ ...h, filled: true })), emptySearches: [] });
    assert.match(r.says, /Either nobody has been looking, or everything they looked for was there/);
  });
});

describe("what a record is missing, in words", () => {
  it("says what a town has not got", () => {
    assert.equal(townMissing({ sections: [], photos: 0, contacts: 0 }), "nothing published at all, no pictures, nobody to call");
    assert.equal(townMissing({ sections: ["food"], photos: 2, contacts: 1 }), "");
    assert.equal(townMissing({ sections: ["food"], photos: 0, contacts: 1 }), "no pictures");
  });

  it("puts getting in first for a beis hachaim, because it stops the visit", () => {
    const said = keverMissing({ burials: 3, burialsWithCoordinates: 2, contacts: 0, hasLocation: false, hasAccessNote: false });
    assert.match(said, /^nobody on file to let you in/);
    assert.match(said, /no address or coordinate/);
  });

  it("says 'nothing checked yet' rather than listing four complaints", () => {
    // Four clauses tell somebody no more than "nothing" does. They just take
    // longer to read and make the list look like a scolding.
    assert.equal(
      keverMissing({ burials: 3, burialsWithCoordinates: 0, contacts: 0, hasLocation: false, hasAccessNote: false }),
      "nothing checked on it yet",
    );
  });

  it("says nothing about grave coordinates when nobody is recorded there", () => {
    // "No checked grave coordinate" for a beis hachaim with no burials is a
    // complaint about a grave that has not been entered.
    const said = keverMissing({ burials: 0, burialsWithCoordinates: 0, contacts: 1, hasLocation: true, hasAccessNote: true });
    assert.equal(said, "nobody recorded as buried there");
  });

  it("is empty for a record with everything on it", () => {
    assert.equal(
      keverMissing({ burials: 2, burialsWithCoordinates: 2, contacts: 1, hasLocation: true, hasAccessNote: true }),
      "",
    );
  });
});
