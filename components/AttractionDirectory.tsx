"use client";

import { useMemo, useState } from "react";
import KosherNearby from "@/components/KosherNearby";
import ListToolbar, { listMatches, listRank } from "@/components/ListToolbar";
import { placeDirectionsUrl } from "@/data/route-utils";
import { extraSpellings } from "@/lib/place-search";
import type { Attraction } from "@/data/attractions";

// What to do on the days that are not kevarim.
//
// The one thing this does that a guidebook does not: every attraction with
// coordinates can show what kosher food is near IT, live, at the moment you
// ask. Nothing about distance is stored, so nothing about it goes stale — the
// list is fetched from OpenStreetMap against this attraction's own position.

export default function AttractionDirectory({ attractions }: { attractions: Attraction[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState("");
  const [openNearby, setOpenNearby] = useState<string | null>(null);

  const countries = useMemo(
    () =>
      [...new Set(attractions.map((a) => a.country))].sort().map((value) => ({
        value,
        label: `${value} (${attractions.filter((a) => a.country === value).length})`,
      })),
    [attractions],
  );
  const kinds = useMemo(
    () => [...new Set(attractions.map((a) => a.kind))].sort().map((value) => ({ value, label: value })),
    [attractions],
  );

  // The notes and the alternate spellings are searched too: half of what makes
  // an entry findable is in its notes ("no kosher food", "pushchair", "toll
  // road"), and a person looking for Merano may well type Meran.
  const shown = attractions
    .filter(
      (a) =>
        (!country || a.country === country) &&
        (!kind || a.kind === kind) &&
        listMatches(
          [a.name, a.city, a.country, a.kind, a.summary, (a.notes ?? []).join(" "), extraSpellings([a.slug, a.city])].join(" "),
          query,
        ),
    )
    .sort((a, b) => listRank(query, a.city, a.name) - listRank(query, b.city, b.name));

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Rome, waterfall, ghetto, something for the children…"
        noun="things to do"
        showing={shown.length}
        total={attractions.length}
        filters={[
          { label: "Country", value: country, onChange: setCountry, options: countries, allLabel: "Everywhere" },
          { label: "Kind", value: kind, onChange: setKind, options: kinds, allLabel: "Anything" },
        ]}
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {shown.map((a) => (
          // The id is what /stops and the planner link to — this page is one
          // page with an anchor per entry, not a page each.
          <article key={a.slug} id={a.slug} className="min-w-0 scroll-mt-24 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">
              {a.city} · {a.country} · {a.kind}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{a.name}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{a.summary}</p>

            {a.notes && a.notes.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">
                {a.notes.map((note, i) => (
                  <li key={i} className="border-l-2 border-[var(--gold-light)] pl-3">{note}</li>
                ))}
              </ul>
            )}

            {/* Said separately from the rest, because it is the thing that
                decides whether a day works or not. */}
            {a.shabbos && (
              <p className="mt-4 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-3 py-2 text-sm leading-6 text-[var(--navy)]">
                <strong>Shabbos</strong> — {a.shabbos}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {a.coordinates && (
                <a
                  href={placeDirectionsUrl(a.address, a.coordinates)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]"
                >
                  Navigate →
                </a>
              )}
              {a.website && (
                <a
                  href={a.website}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[var(--gold-light)] px-3 py-1.5 font-semibold text-[var(--navy)]"
                >
                  Official site →
                </a>
              )}
              {a.coordinates && (
                <button
                  type="button"
                  onClick={() => setOpenNearby(openNearby === a.slug ? null : a.slug)}
                  className="rounded-md border border-[var(--navy)] bg-[var(--navy)] px-3 py-1.5 font-semibold text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
                >
                  {openNearby === a.slug ? "Hide what's nearby" : "Kosher food near here"}
                </button>
              )}
            </div>

            {openNearby === a.slug && a.coordinates && (
              <div className="mt-4">
                <KosherNearby coordinates={a.coordinates} radiusKm={6} autoLoad showAddToTrip heading={`Kosher near ${a.name}`} />
              </div>
            )}

            {a.address && <p className="mt-4 break-words text-xs leading-5 text-stone-500">{a.address}</p>}
          </article>
        ))}
      </div>
    </>
  );
}
