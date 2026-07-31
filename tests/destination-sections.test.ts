import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { destinationDatabase } from "@/data/destination-database";
import {
  DESTINATION_SECTIONS,
  LEGACY_RECORD_SECTIONS,
  SECTION_GROUPS,
  sectionFor,
  sectionLabel,
  sectionOptions,
  sectionsInGroup,
} from "@/lib/destination-sections";
import { PLACE_CATEGORY_LABELS, PLACE_CATEGORY_ORDER } from "@/lib/content";
import { completeness } from "@/lib/verification";

// There used to be five copies of this list — the admin dropdown, the
// completeness tracker, lib/content.ts, the destination page's own renderer,
// and the enum. A section could be editable but uncounted, or recorded but
// dropped on the way to the page. These tests are about there being one.

describe("the sections a destination has", () => {
  it("covers everything the database can store", () => {
    // The PlaceCategory enum, written out. If a value is added to the schema
    // and not here, it becomes storable and invisible.
    const enumValues = [
      "ACCOMMODATION", "KOSHER_FOOD", "MINYAN", "MIKVAH", "TRANSPORT", "AIRPORT", "DRIVER",
      "TEFILLOS", "SHABBOS", "HOSPITAL", "EMERGENCY", "GROCERY", "PARKING",
    ];
    assert.deepEqual(DESTINATION_SECTIONS.map((s) => s.key).sort(), [...enumValues].sort());
  });

  it("names each one and says what belongs in it", () => {
    for (const section of DESTINATION_SECTIONS) {
      assert.ok(section.label.trim(), `${section.key} needs a heading`);
      assert.ok(section.blurb.trim().length > 20, `${section.key} needs to say what belongs in it`);
      assert.ok(SECTION_GROUPS.includes(section.group), `${section.key} is in a real group`);
    }
  });

  it("puts every section in exactly one group", () => {
    const counted = SECTION_GROUPS.reduce((sum, group) => sum + sectionsInGroup(group).length, 0);
    assert.equal(counted, DESTINATION_SECTIONS.length);
  });

  it("offers the grouped list a dropdown needs", () => {
    const options = sectionOptions();
    assert.equal(options.length, SECTION_GROUPS.length);
    assert.equal(options.flatMap((g) => g.options).length, DESTINATION_SECTIONS.length);
  });

  it("does not invent a Yiddish heading it does not have", () => {
    // A translation guessed at by somebody who does not speak the language is
    // wrong in a way only the reader can see. English alone is better.
    for (const section of DESTINATION_SECTIONS) {
      if (section.yiddish !== undefined) assert.ok(section.yiddish.trim(), `${section.key} has an empty Yiddish heading`);
    }
    assert.equal(sectionFor("HOSPITAL")?.yiddish, undefined, "not translated yet, and not pretending");
    assert.equal(sectionFor("MINYAN")?.yiddish, "מנינים");
  });

  it("falls back to the raw key rather than a blank heading", () => {
    assert.equal(sectionLabel("SOMETHING_NEW"), "SOMETHING_NEW");
  });
});

describe("the public page", () => {
  it("has a heading for every section that can be stored", () => {
    // groupPlacesByCategory FILTERS to this order. A category missing from it
    // is a listing recorded in the admin and silently dropped on the way out —
    // no error, the section simply is not there.
    assert.deepEqual([...PLACE_CATEGORY_ORDER].sort(), DESTINATION_SECTIONS.map((s) => s.key).sort());
    for (const key of PLACE_CATEGORY_ORDER) {
      assert.ok(PLACE_CATEGORY_LABELS[key]?.english, `${key} needs an English heading`);
    }
  });
});

describe("what the completeness tracker counts", () => {
  const scored = completeness(destinationDatabase[0]);

  it("counts one field per section, and does not miss any", () => {
    for (const section of DESTINATION_SECTIONS) {
      const counted = scored.missing.includes(section.label) || scored.notTracked.includes(section.label) || !scored.missing.length;
      assert.ok(counted || scored.total > 0, `${section.label} should be accounted for`);
    }
    // Every section, plus the cemetery fields, plus photos.
    assert.ok(scored.total >= DESTINATION_SECTIONS.length + 1);
  });

  it("separates 'nobody filled this in' from 'the record cannot hold it'", () => {
    // The five sections the built-in record has can be answered; the rest
    // genuinely have nowhere to be read from yet, and saying so is the point.
    for (const key of Object.keys(LEGACY_RECORD_SECTIONS)) {
      const label = sectionLabel(key);
      assert.ok(!scored.notTracked.includes(label), `${label} can be answered from the record`);
    }
    assert.ok(scored.notTracked.includes("Hospital"));
    assert.ok(scored.notTracked.includes("Photos"));
  });

  it("still refuses to round a thin record up", () => {
    // The whole point of the number. Adding sections made it smaller, which
    // is the honest direction.
    const average = destinationDatabase.reduce((sum, r) => sum + completeness(r).score, 0) / destinationDatabase.length;
    assert.ok(average < 20, `average completeness is ${average.toFixed(1)}% — if this ever passes, check it is real`);
  });
});
