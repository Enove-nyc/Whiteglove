import Link from "next/link";
import {
  describeTrust,
  TRUST_CLASSES,
  TRUST_METHODOLOGY_PATH,
  trustText,
  type TrustDescriptor,
} from "@/lib/trust-status";

/**
 * How far anybody has checked the thing next to it.
 *
 * Four states and one appearance, everywhere on the site — see
 * lib/trust-status.ts for why there used to be four vocabularies.
 *
 * THREE THINGS IT DOES THAT A COLOURED PILL DOES NOT:
 *
 *   • It carries a glyph as well as a tint. Colour alone would leave the
 *     difference between "verified" and "reported" invisible to anybody who
 *     cannot separate green from amber — and that difference is the whole
 *     content of the badge.
 *
 *   • It says what it means to a screen reader. The visible text is short
 *     ("Reported"); the accessible name is the full sentence, because a badge
 *     read out as the single word "reported" tells a blind traveler nothing.
 *
 * WHY IT IS NOT A LINK BY DEFAULT. It was, and the audit was right to object
 * twice over. Four badges on one page became four links to the same place —
 * four identical rows in a screen reader's link list — and a 30px pill is
 * under the 44px target this site holds itself to, while a 44px status pill
 * looks absurd. So a badge is a label: a span carrying its full sentence as
 * its accessible name. Each page carries ONE descriptive link to the method
 * instead, which is what somebody trying to learn the scale wants anyway.
 *
 * `explain` turns a badge into that link where a page has nowhere better to
 * put it. It gets the full 44px then, because it is a control.
 */
export default function VerificationBadge({
  descriptor,
  lastChecked,
  size = "md",
  explain = false,
  className = "",
}: {
  descriptor: TrustDescriptor;
  /** Only ever printed beside "Verified" — a date next to "being checked" reads as the day the checking finished. */
  lastChecked?: string | null;
  size?: "sm" | "md";
  explain?: boolean;
  className?: string;
}) {
  const tone = TRUST_CLASSES[descriptor.tone];
  const text = trustText(descriptor, lastChecked);
  const sentence = describeTrust(descriptor, lastChecked);
  const shell = [
    "inline-flex items-center gap-1.5 rounded-full border font-semibold",
    size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
    // A control gets a thumb-sized hit area. A label does not need one, and a
    // 44px-tall status pill beside a line of text looks like a mistake.
    explain ? "min-h-11" : "",
    tone.border,
    tone.background,
    tone.text,
    className,
  ].join(" ");

  const body = (
    <>
      <span aria-hidden="true" className="text-sm leading-none">
        {descriptor.glyph}
      </span>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{sentence}</span>
    </>
  );

  if (!explain) return <span className={shell}>{body}</span>;

  return (
    <Link
      href={`${TRUST_METHODOLOGY_PATH}#${descriptor.level}`}
      className={`${shell} underline decoration-dotted underline-offset-2 transition hover:brightness-95`}
    >
      {body}
      <span className="sr-only"> — how we check this</span>
    </Link>
  );
}

/**
 * The line under a section that has nothing in it yet.
 *
 * NOT A BADGE, deliberately. "Nothing has been published here" is not a
 * statement about how accurate something is, and a status pill over an empty
 * section labels a thing that is not there. This says what is missing and what
 * to do instead, which is what somebody standing in front of an empty section
 * actually needs.
 */
export function NothingPublishedYet({ what }: { what: string }) {
  // Renders nothing, deliberately, and the sections that used it are hidden
  // by their own callers instead. Keeping the export means a page that still
  // asks for the old panel gets an empty section rather than a build error.
  void what;
  return null;
}
