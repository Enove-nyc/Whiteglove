"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ListToolbar, { listMatches } from "@/components/ListToolbar";
import { extraSpellings } from "@/lib/place-search";
import type { CemeteryListItem } from "@/lib/cemeteries-view";

// The batei hachaim directory, with a way to find one in it.
//
// A hundred and fifty-odd cards in one grid is not a directory, it is a wall.
// Somebody who knows they want Sanz, or wants everything in Hungary, or is
// looking for the Chozeh without remembering which town he is in, had nothing
// to do but scroll.
//
// So: search across the town, the country and the names of everybody buried
// there — in English or Yiddish — plus a country filter and a choice of order.
// Each card is just the names of the place — Yiddish and English, town and
// country — and the whole card is the link; the kevarim themselves, the
// counts and everything else live on the detail page.
//
// ONE DIRECTORY, ONE LIST. There used to be a second browser lower on the page
// — the Nesiya Tova "batei hachaim worldwide" locator, with its own country
// dropdowns — so the page asked you to pick a country twice. Then the two
// browsers became one search but still drew two grids: the guides, then a
// divided-off "located" section under them. Now it is a single list. The
// curated kevarim guides (rich cards, ~150) are what you see by default, and
// the moment you search a town or choose a country the located grounds join
// the SAME grid for that place, sorted in among the guides rather than fenced
// off below them. The located set stays out of the default view on purpose —
// nearly two thousand location-only entries would bury the guides — and never
// carries a per-card source line; a located card is marked "Location" and its
// own detail page forwards to Nesiya Tova for the details.

type Order = "city" | "country" | "tzaddik" | "kevarim";

/** A Nesiya Tova located ground — a place with a source, not a full guide. */
export type HeritageEntry = { slug: string; city: string; country: string };

export default function CemeteryDirectory({
  cemeteries,
  heritage = [],
  initialCountry = "",
}: {
  cemeteries: CemeteryListItem[];
  /** The Nesiya Tova located set, shown once a town or country narrows the list. */
  heritage?: HeritageEntry[];
  /**
   * Arrived from "Browse by country" on the heritage landing page.
   *
   * A prop rather than a query the component reads for itself, so this stays
   * the same self-contained filter it has always been and the page above it
   * decides what a link means.
   */
  initialCountry?: string;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState(initialCountry);
  const [order, setOrder] = useState<Order>("city");

  // Every country either set knows, so the one dropdown reaches all of them.
  const countries = useMemo(
    () =>
      [...new Set([...cemeteries.map((c) => c.country), ...heritage.map((h) => h.country)])]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [cemeteries, heritage],
  );

  const shown = useMemo(() => {
    const filtered = cemeteries.filter(
      (c) =>
        (!country || c.country === country) &&
        // The same alternate spellings the /stops search has always used. A
        // kever town is written a dozen ways and this page knew none of them:
        // "Lezajsk" and "Leżajsk" found nothing while "Lizhensk" worked.
        listMatches([c.city, c.yiddishCity, c.name, c.yiddishName, c.country, ...c.burials, extraSpellings([c.slug, c.city])].join(" "), query),
    );
    const by: Record<Order, (a: CemeteryListItem, b: CemeteryListItem) => number> = {
      city: (a, b) => a.city.localeCompare(b.city),
      country: (a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city),
      // The name people actually come for. A ground with nobody named yet
      // sorts last rather than first, so the list opens with the ones that
      // have something to show.
      tzaddik: (a, b) => (a.burials[0] ?? "￿").localeCompare(b.burials[0] ?? "￿"),
      kevarim: (a, b) => b.burialCount - a.burialCount || a.city.localeCompare(b.city),
    };
    return [...filtered].sort(by[order]);
  }, [cemeteries, country, query, order]);

  // The located set joins in only once the list is narrowed — otherwise nearly
  // two thousand location-only entries would swamp the guides on first sight.
  const narrowed = Boolean(country || query.trim());
  const heritageShown = useMemo(() => {
    if (!narrowed) return [];
    return heritage
      .filter((h) => (!country || h.country === country) && listMatches([h.city, h.country, extraSpellings([h.slug, h.city])].join(" "), query))
      .sort((a, b) =>
        order === "country" ? a.country.localeCompare(b.country) || a.city.localeCompare(b.city) : a.city.localeCompare(b.city),
      );
  }, [heritage, country, query, order, narrowed]);

  // ONE list, not two. The guides and the located grounds are merged and shown
  // in a single grid, so a town's guide and its located ground sit next to each
  // other rather than in two directories with a divider between them. Ordering
  // by town or country interleaves the two sets by that key; the guide-only
  // orders (by tzaddik, most kevarim) keep the guides in that order and let the
  // located grounds — which have neither — follow.
  const results = useMemo<Array<{ kind: "guide"; c: CemeteryListItem } | { kind: "located"; h: HeritageEntry }>>(() => {
    const guides = shown.map((c) => ({ kind: "guide" as const, c }));
    const located = heritageShown.map((h) => ({ kind: "located" as const, h }));
    const cityOf = (r: (typeof guides)[number] | (typeof located)[number]) => (r.kind === "guide" ? r.c.city : r.h.city);
    const countryOf = (r: (typeof guides)[number] | (typeof located)[number]) => (r.kind === "guide" ? r.c.country : r.h.country);
    const merged = [...guides, ...located];
    if (order === "city") return merged.sort((a, b) => cityOf(a).localeCompare(cityOf(b)));
    if (order === "country") return merged.sort((a, b) => countryOf(a).localeCompare(countryOf(b)) || cityOf(a).localeCompare(cityOf(b)));
    return merged;
  }, [shown, heritageShown, order]);

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Town, country, or who is buried there — Sanz, Kraków, קאָװנע, the Chozeh…"
        searchLabel="Search batei hachaim"
        empty={shown.length === 0 && heritageShown.length === 0}
        mapHref="/map"
        filters={[
          { label: "Country", value: country, onChange: setCountry, options: countries, allLabel: "Everywhere" },
          {
            label: "Order",
            value: order === "city" ? "" : order,
            onChange: (v) => setOrder((v || "city") as Order),
            allLabel: "By town",
            options: [
              { value: "country", label: "By country" },
              { value: "tzaddik", label: "By tzaddik" },
              { value: "kevarim", label: "Most kevarim first" },
            ],
          },
        ]}
      />

      {/* A located ground opens with directions only, and many are locked, so
          the caveat is said once above the one list rather than fencing them
          off into a directory of their own. */}
      {heritageShown.length > 0 && (
        <p className="mt-8 max-w-3xl text-sm leading-6 text-stone-500">
          Entries marked <span className="font-semibold text-[var(--gold-ink)]">Location</span> open with directions
          only — many grounds are locked, so confirm access before travelling.
        </p>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {results.map((result) =>
          result.kind === "guide" ? (
            <Link
              key={result.c.slug}
              href={`/cemeteries/${result.c.slug}`}
              className="min-w-0 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7"
            >
              <h2 dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-4xl">{result.c.yiddishName}</h2>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{result.c.name}</p>
              <p className="mt-3 break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">{result.c.city} · {result.c.country}</p>
            </Link>
          ) : (
            <Link
              key={`h-${result.h.slug}`}
              href={`/cemeteries/heritage/${result.h.slug}`}
              className="flex min-w-0 flex-col justify-between border border-dashed border-[var(--gold-light)] bg-[var(--surface)] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7"
            >
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-3xl">{result.h.city}</h2>
                <p className="mt-3 break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">{result.h.country}</p>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Location</p>
            </Link>
          ),
        )}
      </div>

      {/* Nothing typed and no country chosen: say the located set is there, and
          how to bring it in — without a count, and without a wall of it. */}
      {!narrowed && heritage.length > 0 && (
        <p className="mt-10 max-w-3xl border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-5 py-4 text-sm leading-6 text-stone-600">
          Search a town or choose a country to include the batei hachaim located worldwide from Nesiya Tova. Many grounds
          are locked; confirm access before travelling.
        </p>
      )}
    </>
  );
}
