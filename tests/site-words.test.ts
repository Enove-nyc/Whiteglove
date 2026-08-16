import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { BUILT_IN_WORDS, type SiteWords } from "@/data/site-words";
import { changedWords, FIELDS, mergeWords, onlyChangedWords, whatTheOldScreenSaved, WORD_GROUPS, WORD_KEYS, wordProblem } from "@/lib/site-words";

/**
 * The words the website says about itself.
 *
 * THE TEST THAT MATTERS IS AT THE BOTTOM, and it is the one whose absence
 * caused this whole item. There was already a settings screen with six fields
 * saving to the database, and not one of them was read by any page on the
 * public site. The owner could type a new headline, press Save, reload the
 * front page and see the old one — and nothing anywhere connected the two ends,
 * so there was nothing to notice. The test below reads the source and fails on
 * a word that no page uses.
 */

const with_ = (over: Partial<SiteWords>): SiteWords => ({ ...BUILT_IN_WORDS, ...over });

describe("the built-in words are what the site says", () => {
  it("has a word for every field, and none of them blank", () => {
    for (const key of WORD_KEYS) {
      assert.ok(BUILT_IN_WORDS[key]?.trim(), `${key} ships blank`);
    }
  });

  it("ships a contact address that is an address", () => {
    assert.equal(wordProblem(BUILT_IN_WORDS), null);
    assert.match(BUILT_IN_WORDS.contactEmail, /@/);
  });
});

describe("the owner's words on top", () => {
  it("keeps every line he did not touch", () => {
    const merged = mergeWords({ bookingNotice: "Somewhere new" });
    assert.equal(merged.bookingNotice, "Somewhere new");
    assert.equal(merged.replyPromise, BUILT_IN_WORDS.replyPromise);
  });

  it("returns the built-in wording for nothing at all", () => {
    assert.deepEqual(mergeWords(null), BUILT_IN_WORDS);
    assert.deepEqual(mergeWords({}), BUILT_IN_WORDS);
  });

  it("DROPS a blank rather than using it", () => {
    // A front page with no headline on it is worse than one with the wrong
    // headline, and an empty string in a store is not a decision anybody makes.
    assert.equal(mergeWords({ bookingNotice: "   " }).bookingNotice, BUILT_IN_WORDS.bookingNotice);
    assert.equal(mergeWords({ bookingNotice: 7 } as never).bookingNotice, BUILT_IN_WORDS.bookingNotice);
  });

  it("stores only what differs, so a later correction to the built-in wording still reaches him", () => {
    assert.deepEqual(onlyChangedWords(BUILT_IN_WORDS), {});
    assert.deepEqual(onlyChangedWords(with_({ bookingNotice: "New" })), { bookingNotice: "New" });
    assert.deepEqual(changedWords(with_({ bookingNotice: "New" })).map((f) => f.key), ["bookingNotice"]);
  });
});

describe("what cannot be saved", () => {
  it("refuses a blank, and names where the blank would be", () => {
    const said = String(wordProblem(with_({ bookingNotice: "" })));
    assert.match(said, /cannot be empty/);
    // Named by place — the booking page — so the owner knows where the
    // blank would land, not just that one would.
    assert.match(said, /booking page/, said);
  });

  it("refuses an address that is not an address, because mail would go nowhere", () => {
    assert.match(String(wordProblem(with_({ contactEmail: "contact at whiteglove" }))), /mail going nowhere/);
    assert.match(String(wordProblem(with_({ contactEmail: "someone@nowhere" }))), /not an email address/);
  });

  it("argues about nothing else", () => {
    // These are words on his own front page. A screen that refused a headline
    // for being too long, or the wrong tone, would be an insult.
    assert.equal(wordProblem(with_({ heroTitle: "!" })), null);
    assert.equal(wordProblem(with_({ heroSubtitle: "x".repeat(2000) })), null);
  });
});

describe("what the old screen had saved", () => {
  it("offers what he typed rather than applying it", () => {
    // He typed it into a screen that said it would change the site, and it
    // never did. Putting it live today would change his front page for a
    // decision he may not remember making; discarding it would throw away
    // something he did ask for. So it is shown, and he chooses.
    // The old screen's heroTitle has no home since the hero words retired —
    // an orphaned key is simply not offered, rather than crashing or
    // silently applying. The keys that DO survive still round-trip.
    assert.deepEqual(whatTheOldScreenSaved({ heroTitle: "Every Journey Begins with Purpose." }, BUILT_IN_WORDS), []);
    const offered = whatTheOldScreenSaved({ searchPlaceholder: "Type here" }, BUILT_IN_WORDS);
    assert.equal(offered.length, 1);
    assert.equal(offered[0].key, "searchPlaceholder");
    assert.equal(offered[0].theirs, "Type here");
    assert.equal(offered[0].nowShowing, BUILT_IN_WORDS.searchPlaceholder);
  });

  it("maps the old footerEmail onto the address people are actually told", () => {
    const offered = whatTheOldScreenSaved({ footerEmail: "someone@example.com" }, BUILT_IN_WORDS);
    assert.deepEqual(offered.map((o) => o.key), ["contactEmail"]);
  });

  it("says nothing when the old value already matches, or when there is none", () => {
    assert.deepEqual(whatTheOldScreenSaved({ heroTitle: BUILT_IN_WORDS.heroTitle }, BUILT_IN_WORDS), []);
    assert.deepEqual(whatTheOldScreenSaved(null, BUILT_IN_WORDS), []);
    // publicNotice had no home anywhere on the site, which is part of why none
    // of this worked. It is not offered, because there is nowhere to put it.
    assert.deepEqual(whatTheOldScreenSaved({ publicNotice: "anything" }, BUILT_IN_WORDS), []);
  });
});

describe("the screen describes each line", () => {
  it("gives every word a row, and every row a real word", () => {
    const onScreen = new Set(FIELDS.map((f) => f.key));
    assert.deepEqual(WORD_KEYS.filter((k) => !onScreen.has(k)), [], "a word with no row is one nobody can change");
    const real = new Set<string>(WORD_KEYS);
    assert.deepEqual(FIELDS.filter((f) => !real.has(f.key)).map((f) => f.key), [], "a row for a word that does not exist");
  });

  it("says WHERE each one shows, and links to it", () => {
    for (const field of FIELDS) {
      assert.ok(field.where.trim().length > 10, `${field.key} does not say where it appears`);
      assert.ok(field.href.startsWith("/"), `${field.key} does not link to the page it is on`);
      assert.ok(field.label.trim().length > 3, String(field.key));
    }
  });

  it("puts every row in a group that exists, and leaves no group empty", () => {
    const groups = new Set(WORD_GROUPS.map((g) => g.id));
    for (const field of FIELDS) assert.ok(groups.has(field.group), `${field.key} is in no group`);
    for (const group of WORD_GROUPS) assert.ok(FIELDS.some((f) => f.group === group.id), `${group.id} would render as an empty heading`);
  });
});

/* ---- the one that keeps this honest ------------------------------------- */

/** Every word actually read by something that renders. */
function wordsUsedInSource(): Set<string> {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(path)) continue;
      // The screen that edits them does not count as a page that shows them —
      // that was the whole bug. Nor do the rules or the store.
      if (path.includes("site-words") || path.includes("SiteWordsForm")) continue;
      const code = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const match of code.matchAll(/\b(?:words|BUILT_IN_WORDS)\.([a-zA-Z]+)/g)) found.add(match[1]);
    }
  };
  for (const dir of ["app", "components"]) walk(dir);
  return found;
}

describe("nothing is editable and unread", () => {
  it("SHOWS EVERY WORD SOMEWHERE ON THE SITE", () => {
    // THE ONE THAT MATTERS. This is the exact failure being fixed: six settings
    // that were saved and displayed nowhere, so the Save button changed nothing
    // and nobody could tell. A word on the screen that no page reads is a
    // promise the website does not keep.
    const used = wordsUsedInSource();
    const unread = WORD_KEYS.filter((key) => !used.has(key));
    assert.deepEqual(
      unread,
      [],
      `editable but shown nowhere: ${unread.join(", ")}\n` +
        "Either put it on a page, or take it off the screen — a setting that changes nothing is worse than no setting.",
    );
  });
});
