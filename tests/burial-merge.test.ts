import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { mergeBurials } from "../lib/cemeteries-view";

// THE BUG. A burial saved in the admin against a built-in beis hachaim was
// kept only if its name was NOT already listed in code. That made every
// built-in tzaddik permanently read-only: an owner could type the English
// seforim for Reb Elimelech into the admin, save it, get a success message,
// and nothing would change on the page. The stored record was dropped on the
// floor and nothing said so.
//
// This is the same fix the contacts merge already had, for the same reason —
// its own comment records that a shomer's phone number "could be added but
// never corrected".

const builtIn = [
  { name: "Rabbi Elimelech Weisblum", yiddishName: "רבי אלימלך מליזענסק", knownAs: "Noam Elimelech", seforim: "נועם אלימלך", yahrzeit: "כ״א אדר" },
  { name: "Rabbi Elazar Weisblum", yiddishName: "רבי אלעזר", yahrzeit: "1813" },
];

const stored = (over: Partial<Parameters<typeof mergeBurials>[1][number]>) => [
  { name: "", yiddishName: "", knownAs: null, seforim: null, yahrzeit: null, note: null, ...over },
];

describe("correcting a built-in tzaddik", () => {
  test("a stored record replaces the built-in one of the same name", () => {
    const merged = mergeBurials(builtIn, stored({ name: "Rabbi Elimelech Weisblum", seforim: "Noam Elimelech" }));
    assert.equal(merged.length, 2, "he must not be listed twice");
    assert.equal(merged[0].seforim, "Noam Elimelech");
  });

  test("he keeps his place in the list rather than jumping to the end", () => {
    const merged = mergeBurials(builtIn, stored({ name: "Rabbi Elimelech Weisblum", knownAs: "The Rebbe Reb Meilech" }));
    assert.equal(merged[0].name, "Rabbi Elimelech Weisblum");
    assert.equal(merged[1].name, "Rabbi Elazar Weisblum");
  });

  test("matching ignores case and stray spaces, because a person retypes a name", () => {
    const merged = mergeBurials(builtIn, stored({ name: "  rabbi elimelech weisblum  ", yahrzeit: "21 Adar" }));
    assert.equal(merged.length, 2);
    assert.equal(merged[0].yahrzeit, "21 Adar");
  });

  test("a field left blank does not erase what the built-in record has", () => {
    // The override form is one form; somebody correcting the seforim should
    // not silently wipe the yahrzeit by leaving that box empty.
    const merged = mergeBurials(builtIn, stored({ name: "Rabbi Elimelech Weisblum", seforim: "Noam Elimelech" }));
    assert.equal(merged[0].yahrzeit, "כ״א אדר", "the yahrzeit must survive");
    assert.equal(merged[0].yiddishName, "רבי אלימלך מליזענסק", "the Hebrew name must survive");
    assert.equal(merged[0].knownAs, "Noam Elimelech");
  });
});

describe("what it must not break", () => {
  test("somebody genuinely new is still appended", () => {
    const merged = mergeBurials(builtIn, stored({ name: "Rabbi Zelig Shapira", yiddishName: "רבי זעליג שפירא" }));
    assert.equal(merged.length, 3);
    assert.equal(merged[2].name, "Rabbi Zelig Shapira");
  });

  test("nothing stored hands back the very same array", () => {
    // The caller tells by identity whether anything changed, and returns the
    // static record untouched when nothing did.
    assert.equal(mergeBurials(builtIn, []), builtIn);
  });

  test("an override and an addition together", () => {
    const merged = mergeBurials(builtIn, [
      { name: "Rabbi Elimelech Weisblum", yiddishName: "", knownAs: null, seforim: "Noam Elimelech", yahrzeit: null, note: null },
      { name: "Rabbi Zelig Shapira", yiddishName: "רבי זעליג שפירא", knownAs: null, seforim: null, yahrzeit: null, note: null },
    ]);
    assert.equal(merged.length, 3);
    assert.equal(merged[0].seforim, "Noam Elimelech");
    assert.equal(merged[2].name, "Rabbi Zelig Shapira");
  });
});
