import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directoryProviders } from "@/data/directory";
import { businessList, describeBusinessList } from "@/lib/directory-admin";

/**
 * What the businesses screen shows.
 *
 * THIS EXISTS BECAUSE THE SCREEN SAID "0 PROVIDERS" WHILE THE PUBLIC DIRECTORY
 * SHOWED THIRTY. The editor read only the database; the thirty businesses in
 * data/directory.ts have no row, so an owner with an empty table saw an empty
 * list and the words "Pick a provider or add a new one" — while every visitor
 * was being shown thirty businesses he had no screen for, could not see, could
 * not edit and could not remove. Reported, reasonably, as a lost directory.
 */

const own = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ slug: `mine-${i}`, name: `Mine ${i}`, category: "GUIDE_DRIVER" }));

describe("the list matches what a visitor sees", () => {
  it("shows the built-in businesses when he has none of his own", () => {
    // The whole bug: this used to be an empty list.
    const list = businessList([]);
    assert.equal(list.ownCount, 0);
    assert.equal(list.builtInCount, directoryProviders.length);
    assert.equal(list.rows.length, directoryProviders.length);
    assert.ok(list.rows.every((r) => r.builtIn));
  });

  it("shows his own first, and the built-in ones after", () => {
    const list = businessList(own(2));
    assert.equal(list.rows.length, 2 + directoryProviders.length);
    assert.deepEqual(list.rows.slice(0, 2).map((r) => r.builtIn), [false, false]);
    assert.ok(list.rows.slice(2).every((r) => r.builtIn));
  });

  it("never lists the same business twice", () => {
    // One of his that covers a built-in slug is his. Both rows under one name
    // would be worse than either.
    const shared = directoryProviders[0].slug;
    const list = businessList([{ slug: shared, name: "Mine", category: "GUIDE_DRIVER" }]);
    assert.equal(list.rows.filter((r) => r.slug === shared).length, 1);
    assert.equal(list.rows.find((r) => r.slug === shared)?.builtIn, false);
    assert.equal(list.builtInCount, directoryProviders.length - 1);
  });

  it("marks every built-in one", () => {
    // Nobody should mistake one that ships with the site for something they
    // entered — least of all when wondering where their own went.
    for (const row of businessList([]).rows) assert.equal(row.builtIn, true);
  });
});

describe("which set the public directory is actually showing", () => {
  it("says the built-in ones when he has none", () => {
    assert.equal(businessList([]).showing, "built-in");
  });

  it("says HIS the moment he has one — which is what lib/directory.ts does", () => {
    // All-or-nothing, and this has to agree with it exactly. One row in the
    // database and the built-in list stops being used at all.
    assert.equal(businessList(own(1)).showing, "yours");
  });
});

describe("what he is told", () => {
  it("warns that adding one will replace the built-in list", () => {
    // The event behind "my whole directory of contacts vanished": adding a
    // single business silently takes thirty off the public directory.
    const said = describeBusinessList(businessList([]));
    assert.match(said, /stop being shown/);
    assert.match(said, new RegExp(String(directoryProviders.length)));
    assert.match(said, /Nothing is missing/);
  });

  it("says plainly that the built-in ones are NOT live once he has his own", () => {
    const said = describeBusinessList(businessList(own(3)));
    assert.match(said, /your 3 businesses/);
    assert.match(said, /NOT on the public directory/);
  });

  it("counts one business as one business", () => {
    assert.match(describeBusinessList(businessList(own(1))), /your 1 business\b/);
  });

  it("always says something", () => {
    // The empty screen said nothing at all, which is how two numbers can
    // disagree for weeks without anybody being able to name the problem.
    for (const n of [0, 1, 5]) assert.ok(describeBusinessList(businessList(own(n))).length > 60, String(n));
  });
});
