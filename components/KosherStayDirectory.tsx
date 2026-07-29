"use client";

import { useMemo, useState } from "react";
import KosherNearby from "@/components/KosherNearby";
import ListToolbar, { listMatches } from "@/components/ListToolbar";
import { placeDirectionsUrl } from "@/data/route-utils";
import type { KosherStay } from "@/data/kosher-stays";

// Where to sleep, and what is within walking distance of it.
//
// The distance is measured from the ANCHOR — the shul or quarter the stay sits
// by — and the card says so. Measuring from a hotel coordinate we had guessed
// at would give a more precise-looking number and a less true one.

export default function KosherStayDirectory({ stays }: { stays: KosherStay[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [openNearby, setOpenNearby] = useState<string | null>(null);

  const countries = useMemo(
    () =>
      [...new Set(stays.map((s) => s.country))].sort().map((value) => ({
        value,
        label: `${value} (${stays.filter((s) => s.country === value).length})`,
      })),
    [stays],
  );

  const shown = stays.filter(
    (s) => (!country || s.country === country) && listMatches([s.name, s.city, s.country, s.kind, s.summary].join(" "), query),
  );

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Rome, Alps, B&B, somewhere walkable for Shabbos…"
        noun="places to stay"
        showing={shown.length}
        total={stays.length}
        filters={[{ label: "Country", value: country, onChange: setCountry, options: countries, allLabel: "Everywhere" }]}
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {shown.map((s) => (
          <article key={s.slug} className="min-w-0 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.18em]">
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
            <p className="mt-3 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-3 py-2 text-sm leading-6 text-[var(--navy)]">
              {s.ownerVerified
                ? "The kashrus here has been confirmed by us."
                : "We have not confirmed the kashrus here ourselves — this is what the source says. Check with the hotel or its mashgiach before you rely on it."}
            </p>

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
                className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]"
              >
                Navigate to {s.anchor.name} →
              </a>
              {s.website && (
                <a href={s.website} target="_blank" rel="noreferrer" className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]">
                  Their site →
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpenNearby(openNearby === s.slug ? null : s.slug)}
                className="rounded-md border border-[var(--navy)] bg-[var(--navy)] px-3 py-1.5 font-semibold text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                {openNearby === s.slug ? "Hide what's nearby" : "What's within walking distance"}
              </button>
            </div>

            {openNearby === s.slug && (
              <div className="mt-4">
                <KosherNearby coordinates={s.anchor.coordinates} radiusKm={2} autoLoad showAddToTrip heading={`Kosher within walking distance of ${s.anchor.name}`} />
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
