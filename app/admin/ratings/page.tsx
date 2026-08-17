import ExperienceRatingsInbox from "@/components/ExperienceRatingsInbox";
import { listExperienceRatings } from "@/lib/experience-ratings-store";
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

      <ExperienceRatingsInbox ratings={ratings} reported={reported} />
    </>
  );
}
