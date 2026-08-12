import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { kosherAreas, kosherStays } from "../data/kosher-stays";
import { coordinatesToPoint } from "../data/route-utils";

// Two rules are written into data/kosher-stays.ts as prose, and both of them
// are the kind that go wrong quietly in a later batch.
//
//   1. THE ANCHOR IS A SHUL, NOT A HOTEL. Distances on this site are measured
//      from the shul or quarter a place sits near, because that is the fact we
//      actually know. A hotel pin guessed from a name turns a five-minute walk
//      into a mile, and every drive time computed from it is wrong too.
//
//   2. "CONFIRMED" MEANS THE OWNER CHECKED IT. Not a directory, not a booking
//      site, not a plausible-looking claim on a hotel's own page. A hotel that
//      makes no kosher claim also gets no kashrus caveat printed under it — it
//      never claimed anything, and a disclaimer reads as doubt about something.
//
// A stay is a page somebody plans a Shabbos around. Getting either of these
// wrong sends a family somewhere they cannot eat or cannot walk from.

const COORD = /^-?\d+(\.\d+)?,\s?-?\d+(\.\d+)?$/;

describe("every stay is measured from something real", () => {
  test("each anchor has a name and a usable coordinate", () => {
    for (const s of kosherStays) {
      assert.ok(s.anchor?.name?.trim(), `${s.slug} has no anchor name — "near what?" is the whole listing`);
      assert.match(s.anchor.coordinates, COORD, `${s.slug} anchor is not a coordinate`);
      const point = coordinatesToPoint(s.anchor.coordinates);
      assert.ok(point, `${s.slug} anchor cannot be parsed`);
      assert.ok(point.lat >= -90 && point.lat <= 90, `${s.slug} anchor latitude out of range`);
      assert.ok(point.lng >= -180 && point.lng <= 180, `${s.slug} anchor longitude out of range`);
      assert.ok(point.lat !== 0 || point.lng !== 0, `${s.slug} anchor points at Null Island`);
    }
  });

  test("a stay never carries a coordinate of its own", () => {
    // The type has no such field, and this is here so that adding one becomes a
    // deliberate act with a test to argue with rather than a quiet convenience.
    for (const s of kosherStays) {
      assert.ok(!("coordinates" in s), `${s.slug} has grown a coordinate that is not the anchor's`);
    }
  });

  test("the anchor is described as a place, not as the hotel itself", () => {
    // Weak but worth having: an anchor whose name is just the stay's name back
    // again means somebody filled the field in to satisfy it rather than to say
    // what the place is near.
    for (const s of kosherStays) {
      assert.notEqual(
        s.anchor.name.trim().toLowerCase(),
        s.name.trim().toLowerCase(),
        `${s.slug}: the anchor just repeats the stay's name`,
      );
    }
  });
});

describe("what a stay claims about kashrus", () => {
  test("every claim is one of the three known values", () => {
    for (const s of kosherStays) {
      assert.ok(["none", "reported", "confirmed"].includes(s.kosherClaim), `${s.slug}: "${s.kosherClaim}"`);
    }
  });

  test("nothing claims confirmed kashrus that the owner has not confirmed", () => {
    // This is the line that matters. Nothing researched from a public source
    // may ship as "confirmed" — that word means a person checked with the hotel
    // or its mashgiach. If a future batch needs to set it, this test should be
    // the thing that makes somebody stop and ask whether they really did.
    const claimed = kosherStays.filter((s) => s.kosherClaim === "confirmed");
    assert.deepEqual(
      claimed.map((s) => s.slug),
      [],
      "a stay ships as kashrus-confirmed; confirm with the owner, then add it to this test's allowlist",
    );
  });

  test("a seasonal programme says which season", () => {
    // Arriving in the wrong month gets you a room and nothing to eat, so a
    // programme without dates is worse than no listing.
    for (const s of kosherStays) {
      if (s.kind !== "Seasonal kosher programme") continue;
      assert.ok(s.season?.trim(), `${s.slug} is a seasonal programme with no season named`);
    }
  });

  test("a last-checked date is a real day or is absent", () => {
    for (const s of kosherStays) {
      if (!s.lastChecked) continue;
      assert.match(s.lastChecked, /^\d{4}-\d{2}-\d{2}$/, `${s.slug} lastChecked is not a day`);
    }
  });
});

describe("the quarters", () => {
  test("every quarter has a coordinate the site can navigate to", () => {
    for (const a of kosherAreas) {
      assert.match(a.coordinates, COORD, `${a.slug} is not a coordinate`);
      const point = coordinatesToPoint(a.coordinates);
      assert.ok(point && (point.lat !== 0 || point.lng !== 0), `${a.slug}`);
    }
  });

  test("every quarter says something about what it is like to stay there", () => {
    for (const a of kosherAreas) {
      assert.ok(a.note.trim().length > 40, `${a.slug}'s note is too thin to help anyone choose`);
    }
  });
});

describe("everything carries a source", () => {
  test("stays and quarters alike", () => {
    for (const entry of [...kosherStays, ...kosherAreas]) {
      assert.ok(entry.sourceUrl?.startsWith("http"), `${entry.slug} has no source`);
    }
  });

  test("slugs are unique within each list", () => {
    for (const list of [kosherStays.map((s) => s.slug), kosherAreas.map((a) => a.slug)]) {
      assert.equal(new Set(list).size, list.length);
    }
  });
});
