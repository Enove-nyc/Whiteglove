"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MixedText from "@/components/MixedText";
import ListToolbar, { listMatches, listRank } from "@/components/ListToolbar";

// The kevarim directory, with the search in front.
//
// Three hundred-odd people in one grid needs a way to find one of them, and
// the question people bring here is a name — the Noam Elimelech, not a town.
// The search goes through the same spelling-tolerant matcher every list on
// the site uses (lib/place-search), so "Elimeilech" and "Lezajsk" both land.
//
// AND IT NEEDED A WAY TO READ IT WITHOUT SEARCHING. This was one flat list of
// three hundred and twenty-seven links with no heading anywhere on the page —
// not one h2, not one h3. Somebody using a screen reader has no way through a
// page like that except link by link, all three hundred and twenty-seven of
// them, because the headings list it offers is empty. Somebody sighted gets a
// grid that never changes and no sense of where they are in it.
//
// SO IT IS GROUPED BY COUNTRY, which is not an arbitrary choice: the page's own
// heading is "Who is buried where", and the country is the where. Alphabetical
// was tried first and is useless here — a hundred and fifty-four of the names
// begin "The" and eighty-five begin "Reb", so two letters would hold three
// quarters of the page. Nineteen countries, largest first, is a shape somebody
// can hold in their head.
//
// The order inside a group is untouched: still by the name he is known by,
// which is the decision that made this page work in the first place.

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

/** A country as a fragment id, so the jump links have something to land on. */
function countryId(country: string): string {
  return `kevarim-${country.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export default function TzaddikimDirectory({ people }: { people: TzaddikCard[] }) {
  const [query, setQuery] = useState("");

  const shown = people
    .filter((person) => listMatches(person.search, query))
    .sort(
      (a, b) =>
        listRank(query, a.city, a.knownAs || a.name) - listRank(query, b.city, b.knownAs || b.name),
    );

  /**
   * The groups, rebuilt for whatever is on screen.
   *
   * A search narrows the page, and the headings narrow with it — a country
   * heading over nothing is a heading that lies. Largest group first, so the
   * three that hold three quarters of the kevarim are the three at the top.
   */
  const groups = useMemo(() => {
    const byCountry = new Map<string, TzaddikCard[]>();
    for (const person of shown) {
      const list = byCountry.get(person.country) ?? [];
      list.push(person);
      byCountry.set(person.country, list);
    }
    return [...byCountry.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );
  }, [shown]);

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Noam Elimelech, Sanz, Kraków…"
        searchLabel="Search kevarim by name"
        empty={shown.length === 0}
      />

      {/* Skipping to a country rather than scrolling past four hundred names.
          Hidden when there is only one group, because a list of one place to
          jump to is a row of chrome that jumps you where you already are. */}
      {groups.length > 1 && (
        <nav aria-label="Jump to a country" className="mt-8 border-b border-[var(--gold-light)] pb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
            Where they are buried
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {groups.map(([country, list]) => (
              <li key={country}>
                <a
                  href={`#${countryId(country)}`}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold-light)] underline-offset-4 hover:decoration-[var(--gold)]"
                >
                  {country}
                  <span className="ml-1.5 text-xs font-normal text-stone-500">{list.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {groups.map(([country, list]) => (
        <section key={country} aria-labelledby={countryId(country)} className="mt-10 scroll-mt-28">
          <h2
            id={countryId(country)}
            className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]"
          >
            {country}
            <span className="ml-3 align-middle text-sm font-normal text-stone-500">
              {list.length} {list.length === 1 ? "kever" : "kevarim"}
            </span>
          </h2>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((person) => (
              <li key={person.slug}>
                <Link
                  href={`/tzaddikim/${person.slug}`}
                  className="wg-card wg-kever-card transition hover:border-[var(--gold)] hover:shadow-md"
                >
                  {person.yiddishName && (
                    <span dir="rtl" lang="yi" className="wg-kever-yiddish">
                      <MixedText text={person.yiddishName} lang="yi" />
                    </span>
                  )}
                  <span className="wg-kever-name">{person.knownAs || person.name}</span>
                  {person.knownAs && <span className="wg-kever-alt">{person.name}</span>}
                  {/* The country is the heading above; repeating it on every
                      card underneath it is the same word three hundred times.
                      The town is the part that varies. */}
                  <span className="wg-kever-place">{person.city}</span>
                  {person.yahrzeit && (
                    <span className="wg-kever-yahrzeit"><MixedText text={person.yahrzeit} /></span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
