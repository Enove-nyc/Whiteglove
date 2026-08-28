"use client";

import { useState } from "react";
import { StarRating } from "@/components/reviews/StarRating";
import { useOnline } from "@/components/SaveState";
import { describeSave, saveJson } from "@/lib/save-state";
import {
  MAX_REVIEW_LENGTH,
  reviewTextProblem,
  type PublicReview,
  type ReviewPlaceKind,
  type ReviewScore,
} from "@/lib/place-reviews";

/**
 * Writing or rewriting a review. Rendered only for a signed-in visitor —
 * ReviewSection gates the way in — and the server checks again regardless.
 *
 * The words are optional. A rating with no text saves; demanding a sentence
 * produces "nice place", which tells the next traveller nothing the stars did
 * not. The text rules (no links, no phone numbers) run here first so the
 * message arrives while the box is still in front of them, and run again on
 * the server where they count.
 */
export function ReviewForm({
  placeKind,
  placeRef,
  placeLabel,
  initial,
  onSaved,
  onCancel,
}: {
  placeKind: ReviewPlaceKind;
  placeRef: string;
  placeLabel: string;
  /** The review being edited, when there is one. */
  initial?: PublicReview | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [score, setScore] = useState<ReviewScore | null>(initial?.score ?? null);
  const [text, setText] = useState(initial?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const online = useOnline();

  async function save() {
    if (score === null) {
      setError("Choose a rating.");
      return;
    }
    const problem = reviewTextProblem(text);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await saveJson(
      "/api/reviews",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeKind, placeRef, placeLabel, score, text: text.trim() }),
      },
      online,
    );
    setBusy(false);
    if (!result.ok) {
      setError(describeSave(result.state));
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="rounded-xl border border-[var(--gold-light)] bg-white p-4 sm:p-5"
    >
      <StarRating mode="input" value={score} onChange={setScore} />
      <label htmlFor="review-text" className="mt-4 block text-sm font-semibold text-[var(--navy)]">
        Your words <span className="font-normal text-stone-500">(optional)</span>
      </label>
      <textarea
        id="review-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        maxLength={MAX_REVIEW_LENGTH}
        className="mt-1.5 w-full rounded-lg border border-[var(--gold-light)] bg-white p-3 text-sm text-[var(--navy)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-full bg-[var(--navy)] px-5 text-sm font-semibold text-[var(--cream)] transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Saving" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full px-5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
