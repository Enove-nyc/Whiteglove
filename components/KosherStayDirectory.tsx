"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import KosherNearby from "@/components/KosherNearby";
import RateExperienceLink from "@/components/RateExperienceLink";
import { staySearchHref } from "@/lib/stay-search";
import ListToolbar, { listMatches, listRank } from "@/components/ListToolbar";
import { useListUrl } from "@/components/useListUrl";
import { extraSpellings } from "@/lib/place-search";
import { placeDirectionsUrl } from "@/data/route-utils";
import type { KosherStay } from "@/data/kosher-stays";
import { checkedOn } from "@/lib/trust-status";

// Where to sleep, and what is within walking distance of it.
//
// The distance is measured from the ANCHOR — the shul or quarter the stay sits
// by — and the card says so. Measuring from a hotel coordinate we had guessed
// at would give a more precise-looking number and a less true one.

/** How many cards before the page stops and asks. */
const PAGE = 24;

const DEFAULTS = { q: "", country: "", city: "", kind: "", when: "", kosher: "" };

export default function KosherStayDirectory({ stays }: { stays: KosherStay[] }) {
  // In the address bar, so "the year-round kosher ones in Italy" is a link
  // rather than a set of instructions. components/useListUrl.ts.
  const [filters, setFilters, reset] = useListUrl(DEFAULTS);
  const { q: query, country, city, kind, when, kosher } = filters;
  const [openNearby, setOpenNearby] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const countries = useMemo(
    () =>
      [...new Set(stays.map((s) => s.country))].sort().map((value) => ({
        value,
        label: `${value} (${stays.filter((s) => s.country === value).length})`,
      })),
    [stays],
  );
  const cities = useMemo(
    () =>
      [...new Set(stays.filter((s) => !country || s.country === country).map((s) => s.city))]
        .sort()
        .map((value) => ({ value, label: value })),
    [stays, country],
  );
  const kinds = useMemo(
    () => [...new Set(stays.map((s) => s.kind))].sort().map((value) => ({ value, label: value })),
    [stays],
  );

  // The anchor is searched too — somebody looking for a hotel by the shul
  // types the shul's name, not the hotel's.
  const shown = stays
    .filter(
      (s) =>
        (!country || s.country === country) &&
        (!city || s.city === city) &&
        (!kind || s.kind === kind) &&
        // A seasonal programme is a fortnight in August rather than a hotel,
        // and booking one for the wrong month is the single most expensive
        // mistake this directory can let somebody make. So it is a filter.
        (!when || (when === "seasonal" ? Boolean(s.season?.trim()) : !s.season?.trim())) &&
        // What the source stands behind about the kashrus. `none` is an
        // ordinary hotel listed for the street it is on and never claimed
        // anything, which is a different thing from a claim we have not
        // confirmed.
        (!kosher || s.kosherClaim === kosher) &&
        listMatches(
          [s.name, s.city, s.country, s.kind, s.summary, s.anchor.name, s.season ?? "", (s.notes ?? []).join(" "), extraSpellings([s.slug, s.city])].join(" "),
          query,
        ),
    )
    .sort((a, b) => listRank(query, a.city, a.name) - listRank(query, b.city, b.name));
  const visible = shown.slice(0, limit);

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={(q) => { setFilters({ q }); setLimit(PAGE); }}
        placeholder="Rome, Alps, B&B, somewhere walkable for Shabbos…"
        noun="places to stay"
        showing={shown.length}
        total={stays.length}
        onReset={() => { reset(); setLimit(PAGE); }}
        filters={[
          {
            label: "Country",
            value: country,
            onChange: (value) => { setFilters({ country: value, city: "" }); setLimit(PAGE); },
            options: countries,
            allLabel: "Everywhere",
          },
          { label: "City", value: city, onChange: (value) => { setFilters({ city: value }); setLimit(PAGE); }, options: cities, allLabel: "Any city" },
          { label: "Kind", value: kind, onChange: (value) => { setFilters({ kind: value }); setLimit(PAGE); }, options: kinds, allLabel: "Anything" },
          {
            label: "When it runs",
            value: when,
            onChange: (value) => { setFilters({ when: value }); setLimit(PAGE); },
            options: [
              { value: "year-round", label: "Open year round" },
              { value: "seasonal", label: "Seasonal programme only" },
            ],
            allLabel: "Any time",
          },
          {
            label: "Kosher",
            value: kosher,
            onChange: (value) => { setFilters({ kosher: value }); setLimit(PAGE); },
            options: [
              { value: "confirmed", label: "Kashrus confirmed with the source" },
              { value: "reported", label: "Kashrus reported to us" },
              { value: "none", label: "Ordinary hotel, well placed" },
            ],
            allLabel: "Any",
          },
        ]}
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {visible.map((s) => (
          // The id is what /stops and the planner's hotel picker link to.
          <article key={s.slug} id={s.slug} className="min-w-0 scroll-mt-24 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">
              {s.city} · {s.country} · {s.kind}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{s.name}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{s.summary}</p>

            {/* The two warnings that cost people a Shabbos, said before
                anything else on the card. */}
            {s.season && (
              <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                <strong>Seasonal</strong> — {s.season}
              </p>
            )}
            {/* Only where a kosher claim was actually made. A plain hotel
                gets no kashrus caveat, because it never claimed anything. */}
            {s.kosherClaim === "reported" && (
              <p className="mt-3 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-3 py-2 text-sm leading-6 text-[var(--navy)]">
                We have not confirmed the kashrus here ourselves — this is what the source says. Check with the hotel or
                its mashgiach before you rely on it.
              </p>
            )}
            {s.kosherClaim === "confirmed" && (
              <p className="mt-3 border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">
                The kashrus here has been confirmed by us
                {checkedOn(s.lastChecked) ? ` on ${checkedOn(s.lastChecked)}` : ""}.
              </p>
            )}
            {s.kosherClaim === "none" && (
              <p className="mt-3 text-sm leading-6 text-stone-500">
                No kosher kitchen — listed for where it stands, not for its food.
              </p>
            )}

            {s.notes && s.notes.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">
                {s.notes.map((note, i) => (
                  <li key={i} className="border-l-2 border-[var(--gold-light)] pl-3">{note}</li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-xs leading-5 text-stone-500">
              Distances measured from <strong>{s.anchor.name}</strong>, not from the building itself.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <a
                href={placeDirectionsUrl(undefined, s.anchor.coordinates)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] px-3 font-semibold text-[var(--navy)]"
              >
                Navigate to {s.anchor.name} →
              </a>
              {s.website && (
                <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] px-3 font-semibold text-[var(--navy)]">
                  Their site →
                </a>
              )}
              <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] px-3 font-semibold text-[var(--navy)]">
                Source ↗
              </a>
              <button
                type="button"
                onClick={() => setOpenNearby(openNearby === s.slug ? null : s.slug)}
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-3 font-semibold text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                {openNearby === s.slug ? "Hide what's nearby" : "What's within walking distance"}
              </button>
            </div>

            {/* The next step from a stay somebody likes: check dates and
                prices for that town, or see what there is to do around it.
                Both were two pages away through the navigation. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--gold-light)] pt-3 text-sm">
              <Link
                href={staySearchHref({ destination: s.city })}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Check dates in {s.city} →
              </Link>
              <Link
                href={`/things-to-do?city=${encodeURIComponent(s.city)}`}
                className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Things to do in {s.city} →
              </Link>
              <RateExperienceLink kind="listing" refId={s.slug} label={s.name} />
            </div>

            {openNearby === s.slug && (
              <div className="mt-4">
                <KosherNearby coordinates={s.anchor.coordinates} radiusKm={3} autoLoad showAddToTrip heading={`Kosher within walking distance of ${s.anchor.name}`} />
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Progressive rather than paginated, for the reason in
          AttractionDirectory: /stops and the planner's hotel picker link
          straight to #slug on this page, and an entry on page four of a
          paginated list is a link that lands nowhere. */}
      {shown.length > visible.length && (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE)}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            Show {Math.min(PAGE, shown.length - visible.length)} more
          </button>
          <p className="text-sm text-stone-600">
            Showing {visible.length} of {shown.length}.
          </p>
        </div>
      )}
    </>
  );
}
