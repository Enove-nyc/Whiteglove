import { listExperienceRatings } from "@/lib/experience-ratings-store";
import { SCORE_LABELS, ratingSummary } from "@/lib/experience-ratings";
import { REVIEW_SCORE_LABELS } from "@/lib/place-reviews";
import { listReportedPlaceReviews } from "@/lib/place-review-store";

export const dynamic = "force-dynamic";

/**
 * Ratings people sent in about a listing or a trip.
 *
 * Private inbox. Nothing here is published; case studies still need permission
 * on their own screen.
 *
 * BELOW IT, THE OPPOSITE THING: reported public reviews. Those ARE published —
 * they went up the moment they were written — and this queue is the one lever
 * over them: what readers have flagged, with a Remove that takes one down for
 * good. A plain form post, so the queue works with nothing running client-side.
 */
export default async function AdminRatingsPage() {
  const [ratings, reported] = await Promise.all([listExperienceRatings(), listReportedPlaceReviews()]);

  return (
    <>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">
          Experience ratings
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          How a place or a trip went for somebody. These are not on the public site. If one is worth publishing as a
          case study, that still needs permission on the proof screen.
          {ratings.length > 0 && (
            <>
              {" "}
              <strong className="font-semibold text-[var(--navy)]">{ratings.length} on file.</strong>
            </>
          )}
        </p>
      </header>

      {ratings.length === 0 ? (
        <p className="mt-10 max-w-xl text-sm leading-6 text-stone-600">
          Nothing yet. Travellers rate from a listing, a finished trip, or{" "}
          <code className="text-[var(--navy)]">/rate</code>.
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {ratings.map((rating) => (
            <li key={rating.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                {ratingSummary(rating)}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
                {SCORE_LABELS[rating.score]}
              </p>
              {rating.note ? <p className="mt-3 text-sm leading-6 text-stone-700">{rating.note}</p> : null}
              <p className="mt-3 text-sm text-stone-500">
                {rating.name} ·{" "}
                <a href={`mailto:${encodeURIComponent(rating.email)}`} className="underline decoration-[var(--gold-light)]">
                  {rating.email}
                </a>{" "}
                · {new Date(rating.at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-14">
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">
          Reported reviews
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Public reviews a reader has flagged. They stay on the site until you act. Remove takes one down for good —
          the writer cannot edit it back or write a fresh one for the same place.
        </p>
        {reported.length === 0 ? (
          <p className="mt-6 max-w-xl text-sm leading-6 text-stone-600">Nothing reported.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {reported.map((review) => (
              <li key={review.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                  {review.reportCount} {review.reportCount === 1 ? "report" : "reports"} · {review.placeKind} ·{" "}
                  {review.placeLabel}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
                  {REVIEW_SCORE_LABELS[review.score]}
                </p>
                {review.text ? <p className="mt-3 text-sm leading-6 text-stone-700">{review.text}</p> : null}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-stone-500">
                    {review.authorName || "No name given"} ·{" "}
                    <a
                      href={`mailto:${encodeURIComponent(review.authorEmail)}`}
                      className="underline decoration-[var(--gold-light)]"
                    >
                      {review.authorEmail}
                    </a>{" "}
                    · {new Date(review.at).toLocaleString()}
                  </p>
                  <form method="post" action="/api/admin/reviews">
                    <input type="hidden" name="id" value={review.id} />
                    <button
                      type="submit"
                      className="min-h-11 rounded-full border border-[var(--navy)] px-5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-[var(--cream)]"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
