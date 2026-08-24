"use client";

import { useMemo, useState } from "react";
import AddToItineraryButton from "@/components/AddToItineraryButton";
import SuggestEditPanel from "@/components/SuggestEditPanel";
import ListToolbar, { listMatches, listRank } from "@/components/ListToolbar";
import { IconLink } from "@/components/icons/IconAction";
import { extraSpellings } from "@/lib/place-search";
import { placeDirectionsUrl } from "@/data/route-utils";
import { hechsherLabel } from "@/data/hechsherim";
import type { KosherEatery } from "@/data/kosher-eateries";

// The curated kosher listings. The food finder filters this same White Glove
// collection, so every public card has the same editorial boundary.

function toneFor(state: string) {
  if (state === "certified") return "border-emerald-500 bg-emerald-50 text-emerald-900";
  if (state === "none") return "border-stone-300 bg-stone-50 text-stone-600";
  return "border-amber-400 bg-amber-50 text-amber-900";
}

export default function EateryDirectory({ eateries }: { eateries: KosherEatery[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState("");

  const countries = useMemo(
    () =>
      [...new Set(eateries.map((e) => e.country))].sort().map((value) => ({
        value,
        label: value,
      })),
    [eateries],
  );
  const kinds = useMemo(
    () => [...new Set(eateries.map((e) => e.kind))].sort().map((value) => ({ value, label: value })),
    [eateries],
  );

  // Notes and alternate spellings count here as much as anywhere: somebody
  // types "Villeurbanne" or "Wien" or "badatz", and all three live in the
  // notes rather than the name.
  const shown = eateries
    .filter(
      (e) =>
        (!country || e.country === country) &&
        (!kind || e.kind === kind) &&
        listMatches(
          [e.name, e.city, e.country, e.kind, e.diet, e.summary, (e.notes ?? []).join(" "), e.nearQuarter ?? "", extraSpellings([e.slug, e.city])].join(" "),
          query,
        ),
    )
    .sort((a, b) => listRank(query, a.city, a.name) - listRank(query, b.city, b.name));

  return (
    <>
      {/* Said once, above the one search. It used to sit above a second search
          box further down the page that looked through the same listings. */}
      <p className="mb-5 border-l-4 border-[var(--gold)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-stone-600">
        White Glove&apos;s curated kosher restaurants, bakeries and groceries — search by city, country, kind or name.
        Confirm current supervision directly before you go.
      </p>

      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Rome, bakery, meat, Antwerp…"
        searchLabel="Search kosher listings"
        empty={shown.length === 0}
        filters={[
          { label: "Country", value: country, onChange: setCountry, options: countries, allLabel: "Everywhere" },
          { label: "Kind", value: kind, onChange: setKind, options: kinds, allLabel: "Anything" },
        ]}
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {shown.map((e) => (
          <article key={e.slug} id={e.slug} className="min-w-0 scroll-mt-24 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">
              {[e.city, e.country, e.kind, e.diet].filter(Boolean).join(" · ")}
            </p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{e.name}</h3>

            {/* The kashrus line comes before anything practical because it is
                the thing that decides whether the rest matters. The label
                only — the full wording lives with the hechsherim reference. */}
            {e.hechsher.state !== "unverified" && (
              <p className={`mt-3 inline-block border-l-4 px-3 py-1.5 text-sm font-semibold leading-6 ${toneFor(e.hechsher.state)}`}>
                {hechsherLabel(e.hechsher)}
              </p>
            )}

            {e.address && <p className="mt-3 break-words text-xs leading-5 text-stone-500">{e.address}</p>}

            <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2">
              {e.coordinates && (
                <IconLink icon="directions" label="Directions" href={placeDirectionsUrl(e.address, e.coordinates)} external />
              )}
              {e.website && <IconLink icon="website" label="Website" href={e.website} external />}
              {e.phone && <IconLink icon="phone" label={`Call ${e.phone}`} href={`tel:${e.phone}`} />}
              <SuggestEditPanel targetType="site" targetId={e.slug} title={e.name} compact />
            </div>

            {/* Putting it on the trip, from the one search rather than from a
                second one further down the page. The shared hook behind this
                asks which trip when there is more than one. */}
            <div className="mt-3">
              <AddToItineraryButton
                place={{ id: e.slug, name: e.name, address: e.address, coordinates: e.coordinates }}
                label="Add to my trip"
                className="text-sm"
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
