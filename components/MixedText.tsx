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

export default function MixedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(SEPARATOR);
  if (parts.length === 1) return <span dir="auto" className={className}>{text}</span>;
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && SEPARATOR}
          <span dir="auto" style={{ unicodeBidi: "isolate" }}>{part}</span>
        </span>
      ))}
    </span>
  );
}
