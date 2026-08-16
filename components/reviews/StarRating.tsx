"use client";

import { useId } from "react";
import { Icon } from "@/components/icons/Icon";
import { REVIEW_SCORES, REVIEW_SCORE_LABELS, type ReviewScore } from "@/lib/place-reviews";

/**
 * The three-star scale, shown or asked.
 *
 * THREE, NOT FIVE. The scale is 1 Poor, 2 Good, 3 Excellent, defined once in
 * lib/place-reviews.ts. Do not stretch this to five stars for familiarity —
 * the narrower scale is the owner's decision, and the words carry it.
 *
 * Input mode is native radios: the browser gives arrow-key movement, form
 * semantics and screen-reader grouping free, and a styled span over a
 * visually-hidden peer input gives the visible focus ring WCAG asks for.
 */

type DisplayProps = {
  mode: "display";
  score: ReviewScore;
  /** Small stars in a review row, or the larger summary row. */
  size?: "sm" | "md";
};

type InputProps = {
  mode: "input";
  value: ReviewScore | null;
  onChange: (score: ReviewScore) => void;
};

function Stars({ score, className }: { score: ReviewScore; className: string }) {
  return (
    <>
      {REVIEW_SCORES.map((step) => (
        <Icon key={step} name={step <= score ? "star-filled" : "star"} className={className} />
      ))}
    </>
  );
}

export function StarRating(props: DisplayProps | InputProps) {
  // Hooks before any branch — both modes render from one component.
  const group = useId();

  if (props.mode === "display") {
    const starSize = props.size === "sm" ? "h-4 w-4" : "h-5 w-5";
    return (
      <span
        role="img"
        aria-label={REVIEW_SCORE_LABELS[props.score]}
        className="inline-flex items-center gap-0.5 text-[var(--gold-ink)]"
      >
        <Stars score={props.score} className={starSize} />
      </span>
    );
  }

  const { value, onChange } = props;
  return (
    <fieldset className="border-0 p-0">
      <legend className="sr-only">Rating</legend>
      <div role="radiogroup" aria-label="Rating" className="flex flex-wrap gap-2">
        {REVIEW_SCORES.map((score) => {
          const checked = value === score;
          return (
            <label key={score} className="cursor-pointer">
              <input
                type="radio"
                name={group}
                value={score}
                checked={checked}
                onChange={() => onChange(score)}
                className="peer sr-only"
              />
              <span
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--navy)] peer-focus-visible:outline-offset-2 ${
                  checked
                    ? "border-[var(--navy)] bg-[var(--navy)] text-[var(--cream)]"
                    : "border-[var(--gold-light)] bg-white text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                }`}
              >
                <span className={`inline-flex items-center gap-0.5 ${checked ? "text-[var(--cream)]" : "text-[var(--gold-ink)]"}`} aria-hidden="true">
                  <Stars score={score} className="h-4 w-4" />
                </span>
                {REVIEW_SCORE_LABELS[score]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
