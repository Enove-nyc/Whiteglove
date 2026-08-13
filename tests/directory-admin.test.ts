import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directoryProviders } from "@/data/directory";
import { businessList, describeBusinessList, filterBusinessRows } from "@/lib/directory-admin";

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

describe("whether he has any of his own yet", () => {
  it("says the built-in ones when he has none", () => {
    assert.equal(businessList([]).showing, "built-in");
  });

  it("says HIS the moment he has one", () => {
    assert.equal(businessList(own(1)).showing, "yours");
  });
});

describe("what he is told", () => {
  /**
   * THESE ASSERTIONS ARE THE OPPOSITE OF WHAT THEY USED TO BE, on purpose.
   *
   * They locked in "adding one of your own replaced them" and "NOT on the
   * public directory" long after lib/directory.ts stopped behaving that way —
   * every branch of readProviders() merges now, and the owner's row only wins
   * a collision by slug. The screen went on frightening him with a bug that
   * had been fixed, and the test kept it there.
   */
  it("never says adding one removes the built-in list", () => {
    for (const n of [0, 1, 3, 30]) {
      const said = describeBusinessList(businessList(own(n)));
      assert.doesNotMatch(said, /replaced them|stop being shown|NOT on the public directory/, `own(${n})`);
    }
  });

  it("tells him the built-in ones stay live when he has none of his own", () => {
    const said = describeBusinessList(businessList([]));
    assert.match(said, new RegExp(String(directoryProviders.length)));
    assert.match(said, /alongside them/);
  });

  it("says both sets are live once he has his own, and counts them", () => {
    const list = businessList(own(3));
    const said = describeBusinessList(list);
    assert.match(said, /your 3 businesses/);
    assert.match(said, /alongside/);
    assert.match(said, new RegExp(`All ${list.ownCount + list.builtInCount} are live`));
  });

  it("points at editing a built-in rather than retyping it", () => {
    // The screen promises this; app/admin/directory/businesses/page.tsx now
    // implements it by opening the seed in the form.
    assert.match(describeBusinessList(businessList(own(2))), /open one to edit it/);
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

describe("finding one in a list of sixty", () => {
  it("returns everything when nothing is typed", () => {
    const rows = businessList(own(2)).rows;
    assert.equal(filterBusinessRows(rows, "  ").length, rows.length);
  });

  it("matches on name, whatever the case", () => {
    const rows = businessList(own(3)).rows;
    assert.deepEqual(filterBusinessRows(rows, "mine 1").map((r) => r.slug), ["mine-1"]);
    assert.deepEqual(filterBusinessRows(rows, "MINE 1").map((r) => r.slug), ["mine-1"]);
  });

  it("matches on category, so a whole kind can be pulled up at once", () => {
    const rows = businessList(own(2)).rows;
    assert.ok(filterBusinessRows(rows, "GUIDE_DRIVER").length >= 2);
  });

  it("ignores accents, because that is what an English keyboard types", () => {
    const rows = [{ slug: "r", name: "Rymanów Tours", category: "GUIDE_DRIVER", builtIn: false }];
    assert.equal(filterBusinessRows(rows, "rymanow").length, 1);
  });

  it("finds the built-in ones too — they are the ones he cannot retype", () => {
    const first = directoryProviders[0];
    const found = filterBusinessRows(businessList([]).rows, first.name);
    assert.ok(found.some((r) => r.slug === first.slug));
  });
});
