import Link from "next/link";
import { SPOTLIGHT_COPY, SPOTLIGHT_THEME, type SeasonalWindow } from "@/data/seasonal-spotlight";
import { vacationBrowseHref } from "@/lib/vacation-ideas";

/**
 * One line, in the weeks when it is the question — and gone the rest of the year.
 *
 * NOT A CATEGORY AND NOT A BANNER. It points at a filter that already exists
 * and already has destinations behind it, and it says nothing about programmes,
 * prices, dates or availability: those are somebody else's business and this
 * site does not speak for them. What it knows is that Pesach is coming, which
 * the calendar tells it.
 *
 * RENDERS NOTHING WHEN THERE IS NOTHING, which is most of the year — the
 * caller passes null and this disappears entirely rather than leaving an empty
 * rule or a dimmed chip. That is what keeps it from becoming furniture.
 */
export default function SeasonalSpotlight({ window }: { window: SeasonalWindow | null }) {
  if (!window) return null;

  const copy = SPOTLIGHT_COPY[window.key];
  const href = vacationBrowseHref({ theme: SPOTLIGHT_THEME[window.key], season: "" });

  return (
    <Link
      href={href}
      className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-[var(--gold)] bg-[#FAF8F3] px-4 py-3"
    >
      <span className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
        {copy.headline}
      </span>
      {/* The owner's own line when he has written one, the built-in otherwise. */}
      <span className="text-sm leading-6 text-stone-600">{window.note.trim() || copy.blurb}</span>
    </Link>
  );
}
