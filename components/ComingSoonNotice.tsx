import { BUILT_IN_WORDS } from "@/data/site-words";

/**
 * Sits above a form that is deliberately switched off.
 *
 * The form below it stays visible and stays disabled — somebody can see what
 * will be asked for, which is the point of leaving it there, and cannot fill
 * it in and believe it went somewhere. The email is here because a dead end
 * with no way out is the one thing a premium site should never do to a person
 * who is trying to give it money.
 */
export default function ComingSoonNotice({
  what,
  className = "",
  contactEmail = BUILT_IN_WORDS.contactEmail,
}: {
  /** What is not open yet, as a sentence subject: "Personal flight booking". */
  what: string;
  className?: string;
  /** Where to write instead. Set from /admin/settings/words. */
  contactEmail?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--gold)] bg-[var(--cream)] p-5 sm:p-6 ${className}`}
      role="status"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Coming soon</p>
      <p className="mt-2 text-base font-semibold leading-7 text-[var(--navy)]">
        {what} is not open yet.
      </p>
      <p className="mt-2 text-sm leading-7 text-stone-600">
        The form below shows what we&apos;ll ask for, but it isn&apos;t taking requests yet. In the meantime, everything
        on the site is yours to use — search and book your own flights, hotels and cars, and build the route yourself.
        For anything urgent, email{" "}
        <a
          href={`mailto:${contactEmail}`}
          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          {contactEmail}
        </a>
        .
      </p>
    </div>
  );
}
