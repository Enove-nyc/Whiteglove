"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalize } from "@/lib/place-search";

/**
 * Finding one holiday destination among the rest.
 *
 * THE SAME SEARCH THE HERITAGE TOWNS SCREEN HAS, and for the same reason: a
 * plain list is only usable while you can see all of it, and this one is
 * already past that on a laptop. It was left off when this screen was built,
 * which made the two destination screens behave differently for no reason
 * anybody could have guessed.
 *
 * Matching is folded rather than lowercased, so "Krakow" finds Kraków and
 * "Cote d'Azur" finds Côte d'Azur. Nobody types the accent, and a picker that
 * only answers to the accented spelling is a picker you cannot find the place
 * in. Country and towns are searched too — "Italy" should bring back all of
 * them, and so should "Bellagio".
 */

type Entry = {
  slug: string;
  name: string;
  country: string;
  region?: string;
  cities: readonly string[];
  /** Owner-written rather than shipped with the site. */
  ownerAdded: boolean;
  /** Owner edits sit on top of the built-in text. */
  edited: boolean;
  hidden: boolean;
};

export default function VacationDestinationPicker({
  destinations,
  selectedSlug,
}: {
  destinations: Entry[];
  selectedSlug?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return destinations;
    return destinations.filter((destination) =>
      normalize(
        `${destination.name} ${destination.country} ${destination.region ?? ""} ${destination.cities.join(" ")} ${destination.slug}`,
      ).includes(q),
    );
  }, [query, destinations]);

  return (
    <div className="rounded-2xl border border-[var(--gold-light)] bg-white p-4">
      <label
        htmlFor="vacation-destination-search"
        className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]"
      >
        Find a destination
      </label>
      <input
        id="vacation-destination-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rome, Italy, Bellagio…"
        className="mt-3 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
      />

      {query && (
        <p className="mt-3 text-xs text-stone-500" role="status">
          {filtered.length === 0
            ? "Nothing by that name."
            : `${filtered.length} of ${destinations.length}`}
        </p>
      )}

      <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto pr-1">
        {filtered.map((destination) => {
          const active = destination.slug === selectedSlug;
          const mark = destination.hidden
            ? "Hidden"
            : destination.ownerAdded
              ? "Yours"
              : destination.edited
                ? "Edited"
                : "";
          return (
            <li key={destination.slug}>
              <Link
                href={`/admin/vacation-destinations?slug=${encodeURIComponent(destination.slug)}`}
                className={`flex min-h-11 items-center justify-between gap-2 rounded-md px-3 text-sm transition ${
                  active
                    ? "bg-[var(--navy)] font-semibold text-white"
                    : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                }`}
              >
                <span className="min-w-0 truncate">
                  {destination.name}
                  <span className={`ml-2 text-xs ${active ? "text-white/70" : "text-stone-500"}`}>
                    {destination.country}
                  </span>
                </span>
                {mark && (
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] ${
                      active ? "text-white/70" : "text-stone-400"
                    }`}
                  >
                    {mark}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
