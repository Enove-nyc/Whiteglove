import { listExperienceRatings } from "@/lib/experience-ratings-store";
import { SCORE_LABELS, ratingSummary } from "@/lib/experience-ratings";

export const dynamic = "force-dynamic";

/**
 * Ratings people sent in about a listing or a trip.
 *
 * Private inbox. Nothing here is published; case studies still need permission
 * on their own screen.
 */
export default async function AdminRatingsPage() {
  const ratings = await listExperienceRatings();

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
    </>
  );
}
