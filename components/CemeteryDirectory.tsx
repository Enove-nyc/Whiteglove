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

type Order = "city" | "country" | "tzaddik" | "kevarim";

export default function CemeteryDirectory({
  cemeteries,
  initialCountry = "",
}: {
  cemeteries: CemeteryListItem[];
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

  const countries = useMemo(
    () =>
      [...new Set(cemeteries.map((c) => c.country))]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value })),
    [cemeteries],
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

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Town, country, or who is buried there — Sanz, Kraków, קאָװנע, the Chozeh…"
        searchLabel="Search batei hachaim"
        empty={shown.length === 0}
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

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {shown.map((cemetery) => (
          <Link
            key={cemetery.slug}
            href={`/cemeteries/${cemetery.slug}`}
            className="min-w-0 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7"
          >
            <h2 dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-4xl">{cemetery.yiddishName}</h2>
            <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{cemetery.name}</p>
            <p className="mt-3 break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">{cemetery.city} · {cemetery.country}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
