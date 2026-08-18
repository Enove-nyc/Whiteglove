import Link from "next/link";
import {
  SIGNAL_CLASSES,
  cardCountry,
  cardName,
  cardThemes,
  destinationHref,
  type DirectoryCard,
  type Signal,
} from "@/lib/vacation-ideas";
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
 * WHAT SURVIVED THE TRIM: name, where it is, and the two signals (kosher
 * food, Shabbos) — the essential category information, as compact symbols. The
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
  // The same pair as "city", which the audit measures at 5.90 — the best of
  // the six. Reused rather than invented because a new gradient is a new
  // contrast measurement, and this one is already made. In practice it is
  // rarely drawn: the wash comes from themes[0], and heritage is a second
  // theme on every destination that carries it.
  heritage: "from-[var(--navy)] to-[#344461]",
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

/**
 * A heritage town's card.
 *
 * IT SAYS LESS, AND THAT IS THE POINT. A holiday destination carries a written
 * assessment — why go, how the kosher food works, whether Shabbos is walkable
 * — and nobody has written any of that for Lizhensk. The two signals are
 * therefore absent rather than shown as unknown: an "unknown" chip is a claim
 * that the question was asked, and it was not.
 *
 * What it does carry is true of it: the town, its Yiddish name, the country,
 * and how many kevarim are on record. That last one is the reason somebody is
 * looking at it.
 */
function HeritageBody({ card, compact }: { card: Extract<DirectoryCard, { kind: "heritage" }>; compact: boolean }) {
  return (
    <span className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
      {card.summary && (
        <span className="block text-sm leading-6 text-stone-600 line-clamp-3">{card.summary}</span>
      )}
      <span className="mt-auto flex flex-wrap gap-2 pt-4">
        <span className="inline-flex items-start gap-1.5 rounded-md border border-[var(--gold)] bg-[#fcf6e9] px-2.5 py-1.5 text-[11px] font-semibold leading-4 text-[var(--navy)]">
          {/* THE COUNT, NOT WHAT WE HOLD ABOUT IT. This first read "3 batei
              hachaim on record", which describes the site's own filing rather
              than the town — the same habit as "checked information" and
              "being verified", and the guard test in tests/customer-copy.ts
              caught it. A traveller wants to know there are three. */}
          {card.kevarim > 0
            ? `${card.kevarim} ${card.kevarim === 1 ? "beis hachaim" : "batei hachaim"}`
            : "Jewish heritage"}
        </span>
      </span>
    </span>
  );
}

export default function VacationCard({ card, compact = false }: { card: DirectoryCard; compact?: boolean }) {
  const name = cardName(card);
  const country = cardCountry(card);
  const href = card.kind === "vacation" ? destinationHref(card.destination) : card.href;
  const eyebrow =
    card.kind === "vacation" && card.destination.region
      ? `${card.destination.region} · ${country}`
      : country;
  const wash = THEME_WASH[cardThemes(card)[0] ?? "city"];

  return (
    <Link
      href={href}
      className="wg-card group flex h-full flex-col overflow-hidden border border-[var(--gold-light)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_10px_28px_rgba(23,45,82,.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)] focus-visible:outline-offset-2"
    >
      <span className={`block bg-gradient-to-br ${wash} ${compact ? "px-6 py-5" : "px-6 py-7"}`}>
        <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">
          {eyebrow}
        </span>
        <span className={`mt-2 block font-[family-name:var(--font-display)] leading-tight text-white ${compact ? "text-2xl" : "text-3xl"}`}>
          {name}
        </span>
        {card.kind === "heritage" && card.yiddishName && (
          <span className="mt-1 block text-sm text-[var(--gold-light)]" lang="yi" dir="rtl">
            {card.yiddishName}
          </span>
        )}
      </span>

      {card.kind === "heritage" ? (
        <HeritageBody card={card} compact={compact} />
      ) : (
        <span className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
          <span className={`mt-auto flex flex-wrap gap-2`}>
            <SignalChip signal={card.kosher} />
            <SignalChip signal={card.shabbos} />
          </span>
        </span>
      )}
    </Link>
  );
}
