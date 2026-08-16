"use client";

import { useCallback, useEffect, useState } from "react";
import { IconButton } from "@/components/icons/IconAction";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { StarRating } from "@/components/reviews/StarRating";
import { useRequireSignIn } from "@/components/SignInGate";
import {
  REVIEW_SCORE_LABELS,
  averageReviewScore,
  nearestReviewScore,
  type PublicReview,
  type ReviewPlaceKind,
} from "@/lib/place-reviews";

/**
 * Reviews on a detail page. Mount with the place's kind, ref and label; pass
 * `sacred` from a kever, cemetery, shul or mikvah page, where the section
 * reads as visitor experience — the road, the key, the state of the ohel —
 * because nobody is grading the place itself.
 *
 * NO COUNTS, anywhere. The site publishes no totals of anything, so this
 * shows the words and the stars and stays quiet about how many there are —
 * "All reviews" is a door, not a number.
 *
 * Reviews come back from the API already stripped to initials; the name never
 * reaches the browser. `avatarUrl` is a seam the account system fills when a
 * profile has a picture — until then the initials circle renders.
 */

const RECENT = 3;

async function fetchReviews(placeKind: ReviewPlaceKind, placeRef: string): Promise<PublicReview[]> {
  try {
    const params = new URLSearchParams({ placeKind, placeRef });
    const response = await fetch(`/api/reviews?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as { reviews?: PublicReview[] } | null;
    return response.ok && Array.isArray(payload?.reviews) ? payload.reviews : [];
  } catch {
    return [];
  }
}

function when(at: string): string {
  const date = new Date(at);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "";
}

function AuthorMark({ review }: { review: PublicReview }) {
  if (review.avatarUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- an account's
            own uploaded picture, served from wherever the account system put
            it; next/image would demand every host be configured ahead of time. */}
        <img src={review.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      </>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-sm font-semibold text-[var(--cream)]"
    >
      {review.initials}
    </span>
  );
}

function ReviewRow({
  review,
  onReport,
  reported,
  onEdit,
  onDelete,
  busy,
}: {
  review: PublicReview;
  onReport: (id: string) => void;
  reported: boolean;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-[var(--gold-light)] bg-white p-4">
      <AuthorMark review={review} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StarRating mode="display" score={review.score} size="sm" />
          <span className="text-xs text-stone-500">{when(review.at)}</span>
          {review.mine && <span className="text-xs font-semibold text-[var(--gold-ink)]">Your review</span>}
        </div>
        {review.text && <p className="mt-1.5 text-sm leading-6 text-stone-700">{review.text}</p>}
        {review.mine && (
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Delete your review? This can't be undone.")) onDelete();
              }}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)] disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {!review.mine && (
        <IconButton
          icon="flag"
          label={reported ? "Reported" : "Report this review"}
          active={reported}
          onClick={() => {
            if (!reported) onReport(review.id);
          }}
          className="self-start"
        />
      )}
    </li>
  );
}

export function ReviewSection({
  placeKind,
  placeRef,
  placeLabel,
  sacred = false,
}: {
  placeKind: ReviewPlaceKind;
  placeRef: string;
  placeLabel: string;
  sacred?: boolean;
}) {
  const requireSignIn = useRequireSignIn();
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportedIds, setReportedIds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(() => {
    return fetchReviews(placeKind, placeRef).then(setReviews);
  }, [placeKind, placeRef]);

  useEffect(() => {
    let live = true;
    void fetchReviews(placeKind, placeRef).then((rows) => {
      if (live) setReviews(rows);
    });
    return () => {
      live = false;
    };
  }, [placeKind, placeRef]);

  const mine = reviews?.find((review) => review.mine) ?? null;
  const average = reviews?.length ? averageReviewScore(reviews.map((review) => review.score)) : null;
  const shown = reviews ? (showAll ? reviews : reviews.slice(0, RECENT)) : [];

  async function report(id: string) {
    setReportedIds((current) => new Set(current).add(id));
    try {
      await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // The flag stays lit either way — re-pressing would only re-count.
    }
  }

  async function removeMine() {
    setBusy(true);
    try {
      await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeKind, placeRef }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={sacred ? "Visitor experience" : "Reviews"}>
      <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
        {sacred ? "Visitor experience" : "Reviews"}
      </h2>
      {sacred && (
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Practical notes from visitors — access, directions, and the condition of the site.
        </p>
      )}

      {average !== null && (
        <p className="mt-3 flex items-center gap-2">
          <StarRating mode="display" score={nearestReviewScore(average)} />
          <span className="text-sm font-semibold text-[var(--navy)]">
            {REVIEW_SCORE_LABELS[nearestReviewScore(average)]}
          </span>
        </p>
      )}

      {reviews === null ? (
        <p className="mt-4 text-sm text-stone-500">Loading</p>
      ) : (
        <>
          {shown.length > 0 && (
            <ul className="mt-4 space-y-3">
              {shown.map((review) => (
                <ReviewRow
                  key={review.id}
                  review={review}
                  reported={reportedIds.has(review.id)}
                  onReport={(id) => void report(id)}
                  onEdit={() => setWriting(true)}
                  onDelete={() => void removeMine()}
                  busy={busy}
                />
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {reviews.length > RECENT && (
              <button
                type="button"
                onClick={() => setShowAll((current) => !current)}
                aria-expanded={showAll}
                className="min-h-11 rounded-full border border-[var(--gold-light)] px-5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                {showAll ? "Fewer reviews" : "All reviews"}
              </button>
            )}
            {!writing && !mine && (
              <button
                type="button"
                onClick={() => requireSignIn(() => setWriting(true), "Sign in to review")}
                className="min-h-11 rounded-full bg-[var(--navy)] px-5 text-sm font-semibold text-[var(--cream)] transition hover:opacity-90"
              >
                Add review
              </button>
            )}
          </div>

          {writing && (
            <div className="mt-4">
              <ReviewForm
                placeKind={placeKind}
                placeRef={placeRef}
                placeLabel={placeLabel}
                initial={mine}
                onSaved={() => {
                  setWriting(false);
                  void load();
                }}
                onCancel={() => setWriting(false)}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
