"use client";

import { useState } from "react";

/**
 * A long list, showing its first screenful until somebody asks for the rest.
 *
 * WHAT THIS IS FOR. An outside scan measured the directory pages on a phone
 * and the numbers were the finding: /tzaddikim rendered 70,685 pixels tall,
 * /destinations 53,418, /hechsherim 39,211. Each is technically responsive —
 * nothing overflows sideways — and none of them is usable. The search box that
 * narrows the list ends up tens of thousands of pixels above the records it
 * narrows, there is no sense of position, and browser find becomes the real
 * navigation.
 *
 * WHY THE REST STAYS IN THE HTML. The overflow is hidden in CSS, not dropped
 * from the markup, so every detail link is still in the page a crawler is
 * served and still passes weight to the page it points at. Slicing the array
 * would have been two lines shorter and would have quietly cut three hundred
 * internal links. `display: none` also takes the hidden rows out of the
 * accessibility tree, so a screen reader is not read a list it cannot see —
 * which is the same list it gets after pressing the button.
 *
 * THREE CAPS, NOT A NUMBER OF YOUR CHOOSING. The rule that does the hiding
 * lives in globals.css and cannot read a value from here — CSS has no
 * `nth-child(n + var(--cap))`. So the sizes are declared here, the stylesheet
 * carries one rule per size, and tests/capped-grid.test.ts fails if the two
 * lists ever drift apart.
 *
 * A single site-wide cap was tried first and was wrong in both directions at
 * once. Twelve per group left /tzaddikim at 28,735 pixels, because nineteen
 * countries times twelve is still most of the page; twelve on /destinations
 * showed a browse page eight percent of its own contents. What a cap should be
 * depends on whether the reader is browsing a grid or skimming past a heading
 * to reach one particular group, so the call site says which.
 */
export const CAPS = [6, 12, 24] as const;
export type Cap = (typeof CAPS)[number];

export default function CappedGrid({
  total,
  showAllLabel,
  cap = 12,
  tag = "div",
  className,
  children,
}: {
  /** How many children there are. The button only appears past the cap. */
  total: number;
  /** What the button says, e.g. "Show all 154 kevarim in Poland". */
  showAllLabel: string;
  /**
   * Six for a list somebody is skimming past — many small groups under
   * headings, where the heading is what they are reading. Twenty-four for a
   * grid somebody is browsing, where the contents are the point.
   */
  cap?: Cap;
  tag?: "ul" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const over = total > cap;
  const capped = over && !open;
  const List = tag;

  return (
    <>
      <List className={`${className ?? ""}${capped ? ` wg-capped-${cap}` : ""}`}>{children}</List>

      {over && (
        <p className="mt-5">
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            /* aria-expanded rather than a live region: the button IS the
               control for the list above it, and a screen reader is told the
               state of the thing it is about to change. */
            aria-expanded={open}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--gold)] bg-white px-5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
          >
            {open ? "Show fewer" : showAllLabel}
          </button>
        </p>
      )}
    </>
  );
}
