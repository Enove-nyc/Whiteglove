import FlightReview from "@/components/FlightReview";

// Step two of the admin's Duffel flow: the chosen flight, the traveler
// details, and Duffel's own secure card entry. The flight comes from
// sessionStorage, set by the search on the page before.
export default function AdminDuffelReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Money · Duffel</p>
      <FlightReview backHref="/admin/duffel" />
    </div>
  );
}
