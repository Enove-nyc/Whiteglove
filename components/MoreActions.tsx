/**
 * The actions a card does not need to show until somebody wants them.
 *
 * WHAT THIS IS FOR. A things-to-do card carried nine controls at once —
 * Navigate, Website, Full guide, Kosher food near here, Add to Route, Add to
 * Itinerary, Where to stay, Plan a trip here, Rate, Suggest edit — on every
 * one of several hundred cards. Nine is not a choice, it is a wall; and a
 * screen reader listing the page's links got the same nine names over and
 * over with the place's name nowhere near them.
 *
 * WHAT STAYS OUTSIDE IT. The one thing the card is for (its guide, where
 * there is one) and the two that put the place into a trip — Route and
 * Itinerary — because those are the reason somebody is reading a directory
 * rather than a guide. Everything else is a second thought and lives here.
 *
 * NATIVE <details>, NOT A MENU. It needs no JavaScript, it opens with the
 * keyboard, it announces its own state, and the contents stay in the HTML for
 * a crawler. A custom popover would need all of that written by hand and would
 * get the focus trap wrong on the first attempt.
 */
export default function MoreActions({
  /** Names what these belong to, so a page of them is not "More" fifty times. */
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group/more">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 [&::-webkit-details-marker]:hidden">
        More
        <span className="sr-only"> for {label}</span>
        <span aria-hidden="true" className="transition group-open/more:rotate-180">▾</span>
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-[var(--gold-light)] pl-4 text-sm">
        {children}
      </div>
    </details>
  );
}
