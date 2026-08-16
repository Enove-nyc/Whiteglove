import Link from "next/link";
import { SIGNAL_CLASSES, destinationHref, type Signal, type VacationCardModel } from "@/lib/vacation-ideas";
import type { TripTheme } from "@/data/vacation-destinations";

/**
 * One destination, on the hub and wherever else a row of them is offered.
 *
 * THE WHOLE CARD IS THE LINK now, and nothing on it is a button. It used to
 * carry two or three — "See hotels in Rome", "Explore Rome", "Add Rome to a
 * trip" — and the redesign removes exactly that: a card is a door to the
 * destination's own page, where the hotels search, the itinerary actions and
 * everything else live with room to breathe. A row of cards stopped being a
 * row of small forms.
 *
 * WHAT SURVIVED THE TRIM: name, where it is, one line of why, and the two
 * signals (kosher food, Shabbos) — the essential category information. The
 * best-for/how-long grid and the counted "12 things to do" line went; counts
 * are not shown anywhere public any more, and the rest is on the page the
 * card opens.
 *
 * WHY THERE IS NO PHOTOGRAPH. The site has a picture library and it is for
 * pictures somebody took and credited — lib/photos.ts refuses to publish one
 * without a credit. There are no destination photographs in it yet, and a
 * stock image bought in to fill the space would be the one thing on a card
 * that was not true of the place. So the header is typographic; when there
 * are real, credited pictures, they go here and the rest does not change.
 */

/**
 * The wash behind the name, by what kind of trip it is.
 *
 * Decoration only, and every light end clears 4.5:1 against the gold-light
 * eyebrow — measured, because a gradient has no single colour for the audit
 * to check: beach 4.52 · city 5.90 · mountains 4.82 · family 4.75 ·
 * couples 4.86 · short break 5.12.
 */
const THEME_WASH: Record<TripTheme, string> = {
  beach: "from-[#12384a] to-[#1f5c6b]",
  city: "from-[var(--navy)] to-[#344461]",
  mountains: "from-[#1f3b57] to-[#3a5462]",
  family: "from-[#23405f] to-[#44526b]",
  couples: "from-[#2a2f52] to-[#5b4a63]",
  "short-break": "from-[var(--navy-deep)] to-[#3a4d6f]",
};

function SignalChip({ signal }: { signal: Signal<string> }) {
  return (
    <span
      className={`inline-flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold leading-4 ${SIGNAL_CLASSES[signal.tone]}`}
    >
      <span aria-hidden="true">{signal.glyph}</span>
      <span aria-hidden="true">{signal.label}</span>
      <span className="sr-only">{signal.detail}</span>
    </span>
  );
}

export default function VacationCard({ card, compact = false }: { card: VacationCardModel; compact?: boolean }) {
  const { destination, kosher, shabbos } = card;
  const wash = THEME_WASH[destination.themes[0] ?? "city"];

  return (
    <Link
      href={destinationHref(destination)}
      className="wg-card group flex h-full flex-col overflow-hidden border border-[var(--gold-light)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_10px_28px_rgba(23,45,82,.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)] focus-visible:outline-offset-2"
    >
      <span className={`block bg-gradient-to-br ${wash} ${compact ? "px-6 py-5" : "px-6 py-7"}`}>
        <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">
          {destination.region ? `${destination.region} · ${destination.country}` : destination.country}
        </span>
        <span className={`mt-2 block font-[family-name:var(--font-display)] leading-tight text-white ${compact ? "text-2xl" : "text-3xl"}`}>
          {destination.name}
        </span>
      </span>

      <span className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
        <span className={compact ? "text-sm leading-6 text-stone-600" : "leading-7 text-stone-600"}>{destination.whyGo}</span>

        <span className={`mt-auto flex flex-wrap gap-2 ${compact ? "pt-4" : "pt-5"}`}>
          <SignalChip signal={kosher} />
          <SignalChip signal={shabbos} />
        </span>
      </span>
    </Link>
  );
}
