import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cemeteries } from "@/data/cemeteries";
import { allTzaddikim, getTzaddik, haystack, hrefFor, sortedTzaddikim, tzaddikSlug } from "@/lib/tzaddikim";

/**
 * A page for each person.
 *
 * He existed only as a line inside a beis hachaim page, so there was nowhere
 * to send somebody who asks where the Noam Elimelech is buried — which is how
 * people search, by the person rather than by the town.
 *
 * The thing that has to be right is the address: 327 people share 325 names,
 * and serving one man's page for another's name is worse than having no page.
 */

const everybody = allTzaddikim();

describe("who the site holds", () => {
  it("has one entry for every burial in the built-in record", () => {
    const expected = cemeteries.reduce((total, c) => total + c.burials.length, 0);
    assert.equal(everybody.length, expected);
  });

  it("gives every one of them a different address", () => {
    const slugs = everybody.map((e) => e.slug);
    assert.equal(new Set(slugs).size, slugs.length, "two people share an address");
  });

  it("never produces an empty address", () => {
    for (const entry of everybody) {
      assert.ok(entry.slug.trim().length > 0, `${entry.burial.name} has no address`);
      assert.match(entry.slug, /^[a-z0-9-]+$/, `${entry.burial.name} -> ${entry.slug}`);
    }
  });

  it("finds each one back by its address", () => {
    for (const entry of everybody.slice(0, 40)) {
      assert.equal(getTzaddik(entry.slug)?.burial.name, entry.burial.name);
    }
  });

  it("returns nothing for an address that is not one", () => {
    assert.equal(getTzaddik("not-a-person"), null);
    assert.equal(getTzaddik(""), null);
  });
});

describe("the address itself", () => {
  it("is made from the name, readably", () => {
    assert.equal(tzaddikSlug("Rabbi Elimelech Weisblum"), "rabbi-elimelech-weisblum");
  });

  it("folds accents rather than dropping the letters", () => {
    // The same normaliser the search uses — Ł is a letter, not an accent.
    assert.equal(tzaddikSlug("Reb Łódź"), "reb-lodz");
  });

  it("keeps a short address for a name nobody shares", () => {
    // Only the handful who genuinely collide should carry a town, or every
    // link gets longer for the sake of two of them.
    //
    // Counted from the names rather than by looking for a town on the end of a
    // slug: plenty of these men ARE named after the town they are buried in —
    // "Rabbi Menachem Mendel of Rymanów" at Rymanów — so that test reported
    // thirteen disambiguations where there were two.
    const counts = new Map<string, number>();
    for (const entry of everybody) {
      const base = tzaddikSlug(entry.burial.name);
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    const shared = [...counts.values()].filter((n) => n > 1).length;
    assert.ok(shared <= 5, `${shared} names are shared — the short-address rule is doing more work than expected`);

    // And the ones that are NOT shared keep the plain name as their address.
    const unshared = everybody.filter((e) => counts.get(tzaddikSlug(e.burial.name)) === 1);
    for (const entry of unshared.slice(0, 50)) {
      assert.equal(entry.slug, tzaddikSlug(entry.burial.name), `${entry.burial.name} got a longer address than it needs`);
    }
  });

  it("disambiguates the ones that really are shared", () => {
    const byName = new Map<string, typeof everybody>();
    for (const entry of everybody) {
      const base = tzaddikSlug(entry.burial.name);
      byName.set(base, [...(byName.get(base) ?? []), entry]);
    }
    for (const [base, entries] of byName) {
      if (entries.length < 2) continue;
      const slugs = entries.map((e) => e.slug);
      assert.equal(new Set(slugs).size, slugs.length, `${base} is shared and the addresses still collide`);
      for (const entry of entries) {
        assert.notEqual(entry.slug, base, `${base} is shared but one entry kept the bare name`);
      }
    }
  });
});

describe("linking from a beis hachaim", () => {
  it("finds the page for somebody on that beis hachaim", () => {
    const cemetery = cemeteries.find((c) => c.burials.length > 0)!;
    const href = hrefFor(cemetery.burials[0].name, cemetery.slug);
    assert.match(href ?? "", /^\/tzaddikim\/[a-z0-9-]+$/);
  });

  it("returns nothing for somebody who is not there", () => {
    // The page falls back to the cemetery rather than linking to a 404.
    assert.equal(hrefFor("Nobody At All", cemeteries[0].slug), null);
  });

  it("gives every burial on every beis hachaim a working link", () => {
    for (const cemetery of cemeteries) {
      for (const burial of cemetery.burials) {
        const href = hrefFor(burial.name, cemetery.slug);
        assert.ok(href, `${burial.name} at ${cemetery.slug} has no page`);
        assert.ok(getTzaddik(href!.replace("/tzaddikim/", "")), `${href} leads nowhere`);
      }
    }
  });
});

describe("the directory", () => {
  it("sorts by the name he is known by", () => {
    // Somebody looking for the Noam Elimelech is not looking under W.
    const sorted = sortedTzaddikim();
    const keys = sorted.map((e) => e.burial.knownAs || e.burial.name);
    assert.deepEqual(keys, [...keys].sort((a, b) => a.localeCompare(b)));
  });

  it("can be searched by either name, the seforim or the town", () => {
    const entry = everybody.find((e) => e.burial.seforim && e.burial.knownAs)!;
    const hay = haystack(entry);
    assert.ok(hay.includes(entry.burial.name));
    assert.ok(hay.includes(entry.burial.knownAs!));
    assert.ok(hay.includes(entry.burial.seforim!));
    assert.ok(hay.includes(entry.cemetery.city));
  });
});
