"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import BilingualLabel from "@/components/BilingualLabel";
import type { SiteHit, SiteHitKind, SiteHitSection } from "@/lib/site-search-types";
import { SITE_HIT_KINDS, SITE_HIT_SECTIONS } from "@/lib/site-search-types";

const SECTION_ORDER: SiteHitSection[] = [...SITE_HIT_SECTIONS];
const HERITAGE_FIRST: SiteHitSection[] = [
  "Heritage",
  "Vacation",
  "Stay",
  "Things to do",
  "Kosher travel",
  "Guides and services",
];

export default function SearchResults({
  query,
  results,
  interpretedAs,
  heritageIntent,
}: {
  query: string;
  results: SiteHit[];
  interpretedAs?: string;
  heritageIntent: boolean;
}) {
  const [kindFilter, setKindFilter] = useState<SiteHitKind | "all">("all");

  const filtered = useMemo(
    () => (kindFilter === "all" ? results : results.filter((r) => r.kind === kindFilter)),
    [results, kindFilter],
  );

  const order = heritageIntent ? HERITAGE_FIRST : SECTION_ORDER;
  const groups = order
    .map((section) => ({ section, hits: filtered.filter((h) => h.section === section) }))
    .filter((g) => g.hits.length > 0);

  const presentKinds = SITE_HIT_KINDS.filter((kind) => results.some((r) => r.kind === kind));

  if (!query) {
    return (
      <div className="rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] px-6 py-10 text-center">
        <p className="text-stone-600">Type a place, a hotel, a food stop or a topic to search the site.</p>
        <Link href="/destinations" className="mt-6 inline-block text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
          Browse vacation destinations
        </Link>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] px-6 py-10">
        <p className="text-lg text-[var(--navy)]">No results for “{query}”.</p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
          Try another spelling, a city name, or a broader idea such as beach, mountains or kosher hotel.
        </p>
        <ul className="mt-8 space-y-3 text-sm font-semibold text-[var(--navy)]">
          <li>
            <Link href="/destinations" className="underline decoration-[var(--gold)] underline-offset-4">
              Browse vacation destinations
            </Link>
          </li>
          {!heritageIntent ? (
            <li>
              <Link href="/heritage" className="text-stone-600 underline decoration-[var(--gold-light)] underline-offset-4">
                Or look in Jewish heritage journeys
              </Link>
            </li>
          ) : (
            <li>
              <Link href="/heritage" className="underline decoration-[var(--gold)] underline-offset-4">
                Browse heritage towns and kevarim
              </Link>
            </li>
          )}
          <li>
            <Link href="/kosher" className="text-stone-600 underline decoration-[var(--gold-light)] underline-offset-4">
              Open the kosher food finder
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {interpretedAs ? (
        <p className="text-sm text-stone-600">
          Showing results for <span className="font-semibold text-[var(--navy)]">{interpretedAs}</span>
          <span className="text-stone-400"> — searched as “{query}”</span>
        </p>
      ) : null}

      {presentKinds.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
          <FilterChip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>
            All ({results.length})
          </FilterChip>
          {presentKinds.map((kind) => {
            const count = results.filter((r) => r.kind === kind).length;
            return (
              <FilterChip key={kind} active={kindFilter === kind} onClick={() => setKindFilter(kind)}>
                {kind} ({count})
              </FilterChip>
            );
          })}
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.section} aria-labelledby={`search-section-${group.section}`}>
          <h2
            id={`search-section-${group.section}`}
            className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]"
          >
            {group.section}
          </h2>
          <ul className="mt-4 divide-y divide-[var(--gold-light)] rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6]">
            {group.hits.map((hit) => (
              <li key={hit.id}>
                <Link
                  href={hit.href}
                  onClick={() => {
                    void fetch("/api/analytics", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type: "search_select", kind: hit.kind }),
                      keepalive: true,
                    });
                  }}
                  className="flex w-full max-w-full items-start justify-between gap-4 px-5 py-4 transition hover:bg-[var(--cream-deep)] sm:gap-6"
                >
                  <div className="min-w-0">
                    {hit.yiddish ? (
                      <BilingualLabel primary={hit.yiddish} secondary={hit.title} primaryClassName="text-2xl" secondaryClassName="text-base" compact />
                    ) : (
                      <p className="text-base font-semibold text-[var(--navy)]">{hit.title}</p>
                    )}
                    <p className="mt-1.5 text-sm leading-6 text-stone-600">{hit.subtitle}</p>
                  </div>
                  <span className="shrink-0 pt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)] sm:text-xs">
                    {hit.kind}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
          : "border-[var(--gold-light)] bg-[#fcfaf6] text-[var(--navy)] hover:bg-[var(--cream-deep)]"
      }`}
    >
      {children}
    </button>
  );
}
