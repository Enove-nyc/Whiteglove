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
 *   • It goes somewhere. Every badge is a link to the page that explains the
 *     four, so the scale can be learned once rather than guessed at on each
 *     page. The link text is the status itself, not "learn more" — a screen
 *     reader listing the links on a destination page would otherwise read
 *     "learn more" eleven times.
 *
 * `explain={false}` is for the places a link cannot go — inside another link,
 * such as a card that is itself clickable. There the sentence stays in the
 * accessible name and the page carries one explanatory link of its own.
 */
export default function VerificationBadge({
  descriptor,
  lastChecked,
  size = "md",
  explain = true,
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
export function NothingPublishedYet({
  what,
  askHref = "/contact",
  className = "",
}: {
  /** The subject, lower case: "kosher food in Merano". */
  what: string;
  askHref?: string;
  className?: string;
}) {
  return (
    <p className={`rounded-lg border border-dashed border-stone-400 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 ${className}`}>
      <span className="font-semibold text-[var(--navy)]">Not published yet.</span> We have not finished checking {what},
      and we would rather say so than print something nobody has confirmed.{" "}
      <Link
        href={askHref}
        className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
      >
        Ask us about {what}
      </Link>{" "}
      and we will tell you what we know.
    </p>
  );
}
