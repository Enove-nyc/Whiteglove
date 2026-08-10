import Link from "next/link";
import BookingSearch from "@/components/BookingSearch";
import { duffelReady } from "@/lib/booking-partners";

/**
 * The Duffel flight tools, in the admin and nowhere else.
 *
 * WHY IT MOVED. Duffel is a real booking engine: it takes a card, issues a
 * ticket, and creates an obligation to the traveler that a referral link does
 * not. Running it on the public site made this an online travel agent in every
 * way that matters legally — refunds, schedule changes, involuntary
 * cancellations, IATA and the package-travel rules — alongside a business that
 * is otherwise paid for sending people somewhere else.
 *
 * The decision is to keep it and keep it working, here, until being an OTA is
 * a scope somebody has deliberately taken on. Nothing about the integration
 * changed; only who can reach it.
 *
 * `/book` and `/book/review` no longer offer it. `lib/booking-partners.ts`
 * cannot route the public site to Duffel at all — not by configuration, not by
 * somebody setting DUFFEL_FLIGHTS=1 in a hurry.
 */
export default function AdminDuffelPage() {
  const ready = duffelReady({ DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN });

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Money · Duffel</p>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">
        Flight search and ticketing
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-stone-600">
        This is the only place on the site that can issue a ticket. Visitors search flights through the partner
        links on <Link href="/book" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">the booking page</Link>,
        which forward to Kayak and earn a commission; this books directly and takes a card.
      </p>

      {!ready ? (
        <div className="mt-8 rounded-xl border-2 border-amber-600 bg-amber-50 p-5">
          <p className="font-semibold text-amber-900">The Duffel account is not connected.</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Add <code>DUFFEL_ACCESS_TOKEN</code> and redeploy. You can check the key from{" "}
            <Link href="/admin/settings/connections" className="font-semibold underline">
              Connections
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-xl border border-[var(--gold)] bg-[#fcf6e9] p-5">
            <p className="text-sm leading-6 text-stone-700">
              <span className="font-semibold text-[var(--navy)]">A booking made here is a real one.</span> It charges
              the card and issues a ticket, and the airline&rsquo;s change and refund rules apply from that moment.
              Nothing on the public site can reach this.
            </p>
          </div>
          <div className="mt-8">
            <BookingSearch only="flights" reviewHref="/admin/duffel/review" />
          </div>
        </>
      )}
    </div>
  );
}
