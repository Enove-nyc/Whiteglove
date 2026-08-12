import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { cemeteries } from "../data/cemeteries";
import { coordinatesToPoint } from "../data/route-utils";

// The one rule on this site that is not about tidiness.
//
// People drive to these places. A wrong coordinate on a kever sends a family
// down a farm track in Galicia at dusk, and a phone number that no longer
// reaches anybody sends them to a locked gate with nobody to call. Every batch
// has been written to the same rule — a coordinate only where a source gave the
// actual grave, a source on every entry, and no caretaker's number until the
// owner has confirmed it still rings.
//
// That rule has lived in comments at the top of ten data files and in nothing
// that could fail. This is the part of it a test can hold.

describe("nothing here sends somebody to the wrong place", () => {
  test("every coordinate is one the site can actually navigate to", () => {
    // Checked THROUGH coordinatesToPoint rather than against a format, because
    // that is the function the map links and the distance ranking use. Three
    // entries are written in degrees-minutes-seconds and are perfectly good; an
    // earlier draft of this test called them malformed, which would have been a
    // test failing correct data.
    //
    // This cannot say whether a coordinate is the RIGHT place — nothing can —
    // but an unparseable or out-of-range one is a bug that navigation software
    // will happily act on.
    for (const c of cemeteries) {
      if (!c.coordinates) continue;
      const point = coordinatesToPoint(c.coordinates);
      assert.ok(point, `${c.slug}: "${c.coordinates}" cannot be parsed into a location`);
      assert.ok(Number.isFinite(point.lat) && Number.isFinite(point.lng), `${c.slug} parses to NaN`);
      assert.ok(point.lat >= -90 && point.lat <= 90, `${c.slug} latitude out of range`);
      assert.ok(point.lng >= -180 && point.lng <= 180, `${c.slug} longitude out of range`);
    }
  });

  test("a coordinate of 0,0 never ships", () => {
    // The classic empty-field bug. Null Island is in the Gulf of Guinea, and
    // there is no beis hachaim there.
    for (const c of cemeteries) {
      const point = coordinatesToPoint(c.coordinates);
      if (!point) continue;
      assert.ok(point.lat !== 0 || point.lng !== 0, `${c.slug} points at Null Island`);
    }
  });

  test("every entry says where it came from", () => {
    for (const c of cemeteries) {
      assert.ok(c.sourceUrl?.startsWith("http"), `${c.slug} has no source`);
    }
  });

  test("every entry gives some way of getting there", () => {
    // An entry with neither an address nor an arrival note is one somebody
    // cannot actually reach, which makes listing it worse than leaving it out.
    for (const c of cemeteries) {
      const hasWay = Boolean(c.address?.trim()) || (c.arrivalNotes?.length ?? 0) > 0;
      assert.ok(hasWay, `${c.slug} gives no way of getting there`);
    }
  });

  test("a kever that IS named is named in English and in Yiddish", () => {
    // A BEIS HACHAIM DOES NOT NEED A NAME ON IT. This used to insist every
    // entry listed somebody, and the owner's rule is the other way round: if we
    // know a cemetery is there, it gets a page — with the ground, the way in,
    // and the keyholder's number where we have one. Knowing where Jews are
    // buried is the thing worth publishing; the names come when they come, and
    // waiting for one keeps the whole place off the site.
    //
    // What still holds is that a name, once written, is written properly: parts
    // of this site print the Yiddish alone, so an English-only burial appears
    // as a blank card.
    for (const c of cemeteries) {
      for (const b of c.burials) {
        assert.ok(b.name?.trim(), `${c.slug} has a burial with no name`);
        assert.ok(b.yiddishName?.trim(), `${c.slug}: ${b.name} has no Yiddish name — parts of the site print Yiddish only`);
      }
    }
  });

  test("slugs are unique, so no entry silently replaces another", () => {
    const slugs = cemeteries.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  test("a phone number printed against a kever is dialable and attributed", () => {
    // Not enforceable in full — whether it still rings is the owner's job. This
    // checks the shape, so a placeholder or a half-typed number cannot reach a
    // page where somebody will dial it standing at a locked gate.
    for (const c of cemeteries) {
      for (const contact of c.accessContacts ?? []) {
        if (!contact.phone) continue;
        assert.match(contact.phone, /^[+0-9][0-9 ()\-.]{6,}$/, `${c.slug}: "${contact.phone}" is not a dialable number`);
        assert.ok(contact.label?.trim(), `${c.slug} has a number with nothing saying whose it is`);
      }
    }
  });
});
