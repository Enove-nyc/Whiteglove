import { readAffiliateConfig } from "@/lib/affiliate/config";
import { resolveLink, type AffiliateRequest } from "@/lib/affiliate/partners";
import { goHref } from "@/lib/affiliate/request";
import { readWords } from "@/lib/site-words-store";

/**
 * A link that sends somebody to a partner, and says so.
 *
 * THREE THINGS THIS DOES THAT A HAND-WRITTEN ANCHOR DID NOT.
 *
 * 1. IT IS NOT RENDERED WHEN THERE IS NOTHING BEHIND IT. A booking button for
 *    a product with no programme joined, or a flight search with no airports,
 *    is a button that goes nowhere. `resolveLink` returns null and this
 *    renders `fallback` — usually nothing at all. A site that offers to book
 *    activities and cannot is worse than one that does not offer.
 *
 * 2. IT NAMES WHERE THE VISITOR IS GOING. "Check availability on Booking.com",
 *    not "Check availability". Somebody about to land on a site whose name
 *    they did not choose should be told first; that is the difference between
 *    a hand-off and a surprise, and it is the accessibility rule about a link
 *    identifying its destination.
 *
 * 3. IT CARRIES THE DISCLOSURE. Beside the action, from one editable line, on
 *    every instance. A disclosure that is right in eight places and missing in
 *    the ninth is worse than none: it proves the site knows it owes one.
 *
 * The href is always /go — never the partner. See lib/affiliate/request.ts for
 * why that matters more than it looks.
 */

export default async function BookingLink({
  request,
  label,
  className,
  variant = "primary",
  showDisclosure = true,
  fallback = null,
}: {
  request: AffiliateRequest;
  /** What the button says, without the partner's name — that is added here. */
  label: string;
  className?: string;
  variant?: "primary" | "secondary" | "quiet";
  /**
   * Off only where a disclosure already sits within a line or two of this
   * link — a results grid says it once above the grid rather than on all
   * twenty cards. It is never off because the link is small.
   */
  showDisclosure?: boolean;
  fallback?: React.ReactNode;
}) {
  const config = await readAffiliateConfig();
  const resolved = resolveLink(request, config);
  if (!resolved) return <>{fallback}</>;

  const words = await readWords();
  const where = resolved.route.destinationLabel;

  const styles: Record<string, string> = {
    primary:
      "inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]",
    secondary:
      "inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]",
    quiet:
      "inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4",
  };

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <a
        href={goHref(request)}
        target="_blank"
        // "sponsored" is the value search engines ask for on a paid link and
        // "noopener" is the one that stops the partner's page reaching back
        // into this one. Both, always.
        rel="sponsored noopener noreferrer"
        className={className ?? styles[variant]}
      >
        {label}
        {where && <span className="sr-only"> — opens {where} in a new tab</span>}
      </a>
      {where && (
        <span aria-hidden="true" className="text-[11px] leading-4 text-stone-500">
          Opens {where} in a new tab
        </span>
      )}
      {showDisclosure && (
        <span className="max-w-[34ch] text-[11px] leading-4 text-stone-500">{words.affiliateDisclosure}</span>
      )}
    </span>
  );
}

/**
 * The disclosure on its own, for a grid of booking links.
 *
 * Twenty cards each repeating the same sentence is noise, and noise is how a
 * disclosure stops being read. One statement above the results, and the cards
 * turn theirs off — never because the link is small, only because the sentence
 * is already within a line or two of it.
 */
export async function AffiliateDisclosure({ className }: { className?: string }) {
  const words = await readWords();
  return (
    <p className={className ?? "text-xs leading-5 text-stone-500"}>
      <span className="font-semibold text-[var(--navy)]">How this site is paid: </span>
      {words.affiliateDisclosure}
    </p>
  );
}
