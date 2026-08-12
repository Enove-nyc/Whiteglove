import FlightReview from "@/components/FlightReview";

// Step two of the admin's Duffel flow: the chosen flight, the traveler
// details, and Duffel's own secure card entry. The flight comes from
// sessionStorage, set by the search on the page before. Visitors cannot
// reach this — the folder is money-gated and the booking APIs refuse
// anyone without the admin cookie.
export default function AdminDuffelReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Money · Duffel</p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
        Admin only. Paying here charges a card through Duffel as merchant of record and issues a ticket. This is
        not on the public site.
      </p>
      <FlightReview backHref="/admin/duffel" />
    </div>
  );
}
