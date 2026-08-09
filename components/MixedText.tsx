// Hebrew and Latin on one line, in the order it was written.
//
// A yahrzeit is stored as "כ״א אדר · 5547 / 1787" — the Hebrew date, then the
// years. Rendered as one string it comes out backwards, as "1787 / 5547 · כ״א
// אדר", and no amount of dir= on the wrapper fixes it: the Unicode bidi
// algorithm resolves the separator between the Hebrew run and the digits to
// right-to-left (rule N1 treats European numbers as right-to-left for
// neighbouring neutrals), so the whole tail becomes one right-to-left run and
// reverses.
//
// Splitting on the separator and isolating each piece is what actually works.
// Every segment then resolves on its own — Hebrew stays right-to-left inside
// itself, digits stay left-to-right — and the segments sit in written order.

const SEPARATOR = " · ";

/** Any Hebrew-script character. Both Hebrew and Yiddish are written in it. */
const HEBREW_SCRIPT = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

/**
 * `lang` on the segments that are in Hebrew script, and on no others.
 *
 * dir= alone gets the ORDER right and says nothing about the LANGUAGE, so a
 * screen reader reads a Yiddish name with English phonetics — which is not a
 * near miss, it is unintelligible. The digits and the Latin in a yahrzeit
 * ("כ״א אדר · 5547 / 1787") must NOT be marked, or the year gets read in
 * Hebrew too.
 *
 * `lang` defaults to Hebrew because the commonest use here is a yahrzeit. A
 * caller showing a Yiddish town or a person's Yiddish name passes "yi" — both
 * are written in the same script and a screen reader pronounces them
 * differently.
 */
export default function MixedText({ text, className, lang = "he" }: { text: string; className?: string; lang?: "he" | "yi" }) {
  const langOf = (part: string) => (HEBREW_SCRIPT.test(part) ? lang : undefined);
  const parts = text.split(SEPARATOR);
  if (parts.length === 1) return <span dir="auto" lang={langOf(text)} className={className}>{text}</span>;
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && SEPARATOR}
          <span dir="auto" lang={langOf(part)} style={{ unicodeBidi: "isolate" }}>{part}</span>
        </span>
      ))}
    </span>
  );
}
