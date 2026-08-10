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
 * 2. IT WARNS THAT THE LINK LEAVES, WITHOUT NAMING WHO IT LEAVES TO. It used
 *    to read "Check availability on Booking.com"; the owner's decision is that
 *    which network settles the commission is the site's own business, so it is
 *    "Check availability" and "opens in a new tab". The warning itself is not
 *    optional — a link that opens a window unannounced is an accessibility
 *    failure whoever it points at. See `hotelButtonLabel` in lib/stay22.ts.
 *
 * 3. IT NO LONGER CARRIES THE DISCLOSURE. It used to, on every instance, from
 *    one editable line. The owner moved that sentence to /terms; see
 *    AffiliateDisclosure below, which now renders there instead. Nothing else
 *    about the hand-off changed — rel="sponsored" still marks the link as paid
 *    for search engines, which is a separate thing from telling the reader.
 *
 * The href is always /go — never the partner. See lib/affiliate/request.ts for
 * why that matters more than it looks.
 */

export default async function BookingLink({
  request,
  label,
  className,
  variant = "primary",
  fallback = null,
}: {
  request: AffiliateRequest;
  /** What the button says, without the partner's name — that is added here. */
  label: string;
  className?: string;
  variant?: "primary" | "secondary" | "quiet";
  fallback?: React.ReactNode;
}) {
  const config = await readAffiliateConfig();
  const resolved = resolveLink(request, config);
  if (!resolved) return <>{fallback}</>;

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
        {/* The name is gone, the warning is not — see hotelButtonLabel in
            lib/stay22.ts. `where` still gates it: no route, no hand-off, so
            nothing to warn about. */}
        {where && <span className="sr-only"> — opens in a new tab</span>}
      </a>
      {where && (
        <span aria-hidden="true" className="text-[11px] leading-4 text-stone-500">
          Opens in a new tab
        </span>
      )}
      {/* The commission line moved to /terms — the owner's decision. */}
    </span>
  );
}

/**
 * The disclosure on its own.
 *
 * Now rendered on /terms rather than beside each search — the owner's
 * decision. It stays a component reading the one editable line from
 * /admin/settings/words so the sentence has a single source, wherever it is
 * shown from.
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
