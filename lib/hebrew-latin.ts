/**
 * A Hebrew-script query, sounded out in Latin letters.
 *
 * WHY THIS SITE NEEDS IT. Somebody searched בארדיאב and got nothing. The town
 * is in the index — as Bardejov, with bardiov and bardyov beside it, and with
 * its Yiddish name בארטפעלד, which is Bartfeld. Both spellings are correct and
 * they are not each other: one is the Slovak name sounded out, the other is
 * what the town has been called in Yiddish for centuries. No amount of fuzzy
 * matching bridges them, because they are not misspellings of one another.
 *
 * What does bridge them is the sound. בארדיאב read letter by letter is
 * "bardiav", which is a hair from "bardiov" — a spelling the index already
 * carries. So a Hebrew-script query is also tried as Latin, and the ordinary
 * typo tolerance closes the rest of the gap.
 *
 * IT IS DELIBERATELY CRUDE. This is not transliteration scholarship and must
 * not pretend to be: Hebrew script does not write most vowels, so any mapping
 * is a guess at what was meant. It exists to produce a string close enough for
 * an edit-distance match to finish the job, and it is only ever used as a
 * SECOND attempt — a query that already found something never reaches it.
 */

/** Final forms first, so ך is not read as כ in the middle of a word. */
const LETTERS: Array<[RegExp, string]> = [
  [/וו/g, "v"],
  [/יי/g, "ay"],
  [/אי/g, "i"],
  [/או/g, "u"],
  [/[ךכ]/g, "k"],
  [/[םמ]/g, "m"],
  [/[ןנ]/g, "n"],
  [/[ףפ]/g, "f"],
  [/[ץצ]/g, "tz"],
  [/א/g, "a"],
  [/ב/g, "b"],
  [/ג/g, "g"],
  [/ד/g, "d"],
  [/ה/g, "h"],
  [/ו/g, "o"],
  [/ז/g, "z"],
  [/ח/g, "ch"],
  [/ט/g, "t"],
  [/י/g, "i"],
  [/ל/g, "l"],
  [/ס/g, "s"],
  [/ע/g, "e"],
  [/ק/g, "k"],
  [/ר/g, "r"],
  [/ש/g, "sh"],
  [/ת/g, "s"],
];

const HEBREW_LETTER = /[֐-׿יִ-ﭏ]/;

export function hasHebrew(value: string): boolean {
  return HEBREW_LETTER.test(value);
}

/**
 * The same words, sounded out. Latin words in the query are left alone, so a
 * mixed query keeps the half that already worked.
 */
export function hebrewToLatin(value: string): string {
  let out = value
    // Nikud and cantillation carry no consonant and would become noise.
    .replace(/[֑-ׇ]/g, "")
    // The two ligature blocks are the same letters in another encoding.
    .normalize("NFKC");
  for (const [pattern, replacement] of LETTERS) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, " ").trim();
}
