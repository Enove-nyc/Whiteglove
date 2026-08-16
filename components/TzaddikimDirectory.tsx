"use client";

import Link from "next/link";
import { useState } from "react";
import MixedText from "@/components/MixedText";
import ListToolbar, { listMatches, listRank } from "@/components/ListToolbar";

// The kevarim directory, with the search in front.
//
// Three hundred-odd people in one grid needs a way to find one of them, and
// the question people bring here is a name — the Noam Elimelech, not a town.
// The search goes through the same spelling-tolerant matcher every list on
// the site uses (lib/place-search), so "Elimeilech" and "Lezajsk" both land.

/** One person, flattened for the browsing card. The full record stays on his page. */
export type TzaddikCard = {
  slug: string;
  yiddishName: string;
  name: string;
  knownAs?: string;
  yahrzeit?: string;
  city: string;
  country: string;
  /** Everything a search may match — both names, seforim, town, spellings. */
  search: string;
};

export default function TzaddikimDirectory({ people }: { people: TzaddikCard[] }) {
  const [query, setQuery] = useState("");

  const shown = people
    .filter((person) => listMatches(person.search, query))
    .sort(
      (a, b) =>
        listRank(query, a.city, a.knownAs || a.name) - listRank(query, b.city, b.knownAs || b.name),
    );

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Noam Elimelech, Sanz, Kraków…"
        searchLabel="Search kevarim by name"
        empty={shown.length === 0}
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((person) => (
          <li key={person.slug}>
            <Link
              href={`/tzaddikim/${person.slug}`}
              className="wg-card block h-full border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md"
            >
              {person.yiddishName && (
                <span dir="rtl" lang="yi" className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                  <MixedText text={person.yiddishName} lang="yi" />
                </span>
              )}
              <span className="mt-1 block font-semibold text-[var(--navy)]">{person.knownAs || person.name}</span>
              {person.knownAs && <span className="block text-sm text-stone-500">{person.name}</span>}
              <span className="mt-2 block text-sm text-stone-500">
                {person.city} · {person.country}
              </span>
              {person.yahrzeit && (
                <span className="mt-1 block text-xs text-stone-400"><MixedText text={person.yahrzeit} /></span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
