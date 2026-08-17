import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchField } from "@/lib/site-search-match";

/**
 * "ROME" MUST NOT FIND A PROMENADE.
 *
 * Reported from the live site: searching Rome returned results whose only
 * connection to it was the letters r-o-m-e sitting inside a longer word.
 * "Promenade" contains them, and so does any number of unrelated names, so a
 * short place name matched half the site and did it at the same rank as the
 * city itself.
 *
 * The rule now: a one-word query has to land on a word — the whole field, a
 * whole token, or the start of one. A multi-word query may still match inside
 * a longer name, because quoting a phrase out of the middle of a name is
 * exactly what somebody typing two words means.
 */
describe("a single word must match a word", () => {
  it("ranks the city itself first and does not match it inside longer words", () => {
    const rome = matchField("rome", "Rome");
    assert.equal(rome.ok, true);
    assert.equal(rome.rank, 0, "an exact title is the best match there is");

    for (const field of ["The seaside promenade", "Promenade des Anglais", "Le Promenade Hotel"]) {
      assert.equal(matchField("rome", field).ok, false, `rome should not match "${field}"`);
    }
  });

  it("still matches the start of a word, which is how people type", () => {
    // "rome" against "Rome Fiumicino Airport" — a real prefix, not a passenger
    // inside somebody else's word.
    const airport = matchField("rome", "Rome Fiumicino Airport");
    assert.equal(airport.ok, true);
    assert.ok(airport.rank <= 2);
  });

  it("keeps phrase matches inside longer names", () => {
    const phrase = matchField("sally mayer", "Around Via Sally Mayer and the Via Guastalla synagogue");
    assert.equal(phrase.ok, true);
    assert.ok(phrase.rank >= 3, "a phrase found mid-name ranks below a name match, not above it");
  });

  it("leaves the spelling-tolerant paths alone", () => {
    assert.equal(matchField("dolomits", "The Dolomites").ok, true, "a typo still finds the place");
    assert.equal(matchField("esim", "e-SIM data plans").ok, true, "hyphens and spaces still collapse");
  });
});
