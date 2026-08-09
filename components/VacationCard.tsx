import Link from "next/link";
import GloveMark from "@/components/GloveMark";
import { SIGNAL_CLASSES, addToTripHref, destinationHref, type Signal, type VacationCardModel } from "@/lib/vacation-ideas";
import { staySearchHref } from "@/lib/stay-search";
import type { TripTheme } from "@/data/vacation-destinations";

/**
 * One destination, on the hub and wherever else a row of them is offered.
 *
 * WHY THERE IS NO PHOTOGRAPH. The site has a picture library and it is for
 * pictures somebody took and credited — lib/photos.ts refuses to publish one
 * without a credit, for the good reason that a photograph belongs to whoever
 * took it. There are no destination photographs in it yet. A stock image
 * bought in to fill the space would be the one thing on a card that was not
 * true of the place, on a site whose whole argument is that what it prints has
 * been checked.
 *
 * So the header is typographic and the destination's own name carries it, in
 * the same navy-and-gold the rest of the site is built from. When there are
 * real, credited pictures, they go here and the rest of the card does not
 * change.
 *
 * COMPACT, ON THE FRONT PAGE. Six of these were most of the scroll between the
 * vacation categories and the two ways to plan, and each repeated the kosher
 * and Shabbos answers that the destination's own page gives properly, with the
 * length, who it suits, how many things there are to do, and two buttons. The
 * front page now shows three, and `compact` takes the card down to what a
 * person needs in order to decide whether to press it: where it is, why go, the
 * two labels, and the two ways in. The full card is unchanged on the hub, where
 * somebody IS comparing.
 *
 * WHY THE CARD IS NOT ONE BIG LINK. It has several actions — see what it costs
 * to stay, read about it, start a trip with it — and a card-sized link with
 * buttons inside it is
 * either invalid markup or a swallowed click. Two links, both named after what
 * they do and after the destination, so a screen reader listing the links on
 * this page reads "Explore Rome" rather than "Open" eleven times.
 */

/**
 * The wash behind the name, by what kind of trip it is.
 *
 * Decoration only: nothing here is the sole carrier of any information — the
 * themes are printed as words on the card as well.
 *
 * BUT IT CARRIES TEXT, so the light end of every one of these is chosen for
 * contrast rather than for looks. The eyebrow is gold-light at eleven pixels,
 * which needs 4.5:1, and the first version of this list failed it badly — the
 * beach wash ended at #2f7f92 and gave 2.77:1. Measured against gold-light and
 * against white, every end below now clears 4.5:1:
 *
 *   beach 4.52 · city 5.90 · mountains 4.82 · family 4.75 · couples 4.86 ·
 *   short break 5.12   (gold-light on the lighter end of each)
 *
 * `npm run audit:ui` cannot check these itself — a gradient has no single
 * colour to compare against, and it says so rather than guessing. That is
 * exactly why the numbers are written down here.
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
  const { destination, kosher, shabbos, thingsToDo, places } = card;
  const wash = THEME_WASH[destination.themes[0] ?? "city"];

  return (
    <article className="wg-card flex h-full flex-col overflow-hidden border border-[var(--gold-light)] bg-[var(--surface)]">
      <div className={`bg-gradient-to-br ${wash} ${compact ? "px-6 py-5" : "px-6 py-7"}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">
          {destination.region ? `${destination.region} · ${destination.country}` : destination.country}
        </p>
        <h3 className={`mt-2 font-[family-name:var(--font-display)] leading-tight text-white ${compact ? "text-2xl" : "text-3xl"}`}>
          {destination.name}
        </h3>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "p-5" : "p-6"}`}>
        <p className={compact ? "text-sm leading-6 text-stone-600" : "leading-7 text-stone-600"}>{destination.whyGo}</p>

        {!compact && (
        <dl className="mt-5 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Best for</dt>
            <dd className="mt-0.5 font-semibold text-[var(--navy)]">{destination.bestFor.join(" · ")}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">How long</dt>
            <dd className="mt-0.5 font-semibold text-[var(--navy)]">{destination.suggestedLength}</dd>
          </div>
        </dl>
        )}

        <div className={`flex flex-wrap gap-2 ${compact ? "mt-4" : "mt-5"}`}>
          <SignalChip signal={kosher} />
          <SignalChip signal={shabbos} />
        </div>

        {!compact && (thingsToDo > 0 || places > 0) && (
          <p className="mt-4 flex items-center gap-2 text-xs text-stone-500">
            <GloveMark size="xs" />
            {[
              thingsToDo > 0 ? `${thingsToDo} thing${thingsToDo === 1 ? "" : "s"} to do` : null,
              places > 0 ? `${places} place${places === 1 ? "" : "s"} to stay` : null,
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            on record
          </p>
        )}

        <div className={`mt-auto flex flex-wrap gap-2 ${compact ? "pt-5" : "pt-6"}`}>
          {/* The commercial action, and the one in navy.
              "Explore Rome" was the primary here, and it is the right first
              press for somebody reading — but a person looking at a row of
              destinations with dates in mind is asking where they would sleep,
              and that question was two pages away. It lands on /hotels, which
              answers the quarter and the Shabbos side before it offers a
              partner anything. */}
          <Link
            href={staySearchHref({ destination: destination.name })}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            See hotels in {destination.name}
          </Link>
          <Link
            href={destinationHref(destination)}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
          >
            Explore {destination.name}
          </Link>
          {/* Two on the short card. "Add Rome to a trip" is the right third
              action when somebody is comparing a filtered list; on the front
              page it is a third button before they have read anything. */}
          {!compact && (
            <Link
              href={addToTripHref(destination)}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              Add {destination.name} to a trip
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
