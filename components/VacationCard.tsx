import Link from "next/link";
import GloveMark from "@/components/GloveMark";
import { SIGNAL_CLASSES, addToTripHref, destinationHref, type Signal, type VacationCardModel } from "@/lib/vacation-ideas";
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
 * WHY THE CARD IS NOT ONE BIG LINK. It has two actions — read about it, or
 * start a trip with it — and a card-sized link with buttons inside it is
 * either invalid markup or a swallowed click. Two links, both named after what
 * they do and after the destination, so a screen reader listing the links on
 * this page reads "Explore Rome" rather than "Open" eleven times.
 */

/**
 * The wash behind the name, by what kind of trip it is.
 *
 * Decoration, and it is aria-hidden. Nothing here is the only carrier of any
 * information — the themes are also printed as words on the card.
 */
const THEME_WASH: Record<TripTheme, string> = {
  beach: "from-[#1d4a63] to-[#2f7f92]",
  city: "from-[var(--navy)] to-[#344461]",
  mountains: "from-[#1f3b57] to-[#4c6b7a]",
  family: "from-[#23405f] to-[#5a6a86]",
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

export default function VacationCard({ card }: { card: VacationCardModel }) {
  const { destination, kosher, shabbos, thingsToDo, places } = card;
  const wash = THEME_WASH[destination.themes[0] ?? "city"];

  return (
    <article className="wg-card flex h-full flex-col overflow-hidden border border-[var(--gold-light)] bg-[var(--surface)]">
      <div className={`bg-gradient-to-br ${wash} px-6 py-7`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--gold-light)]">
          {destination.region ? `${destination.region} · ${destination.country}` : destination.country}
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-white">
          {destination.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="leading-7 text-stone-600">{destination.whyGo}</p>

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

        <div className="mt-5 flex flex-wrap gap-2">
          <SignalChip signal={kosher} />
          <SignalChip signal={shabbos} />
        </div>

        {(thingsToDo > 0 || places > 0) && (
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

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Link
            href={destinationHref(destination)}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            Explore {destination.name}
          </Link>
          <Link
            href={addToTripHref(destination)}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
          >
            Add {destination.name} to a trip
          </Link>
        </div>
      </div>
    </article>
  );
}
