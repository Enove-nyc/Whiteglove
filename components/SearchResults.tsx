"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import BilingualLabel from "@/components/BilingualLabel";
import {
  heritageKindHeading,
  kindLabel,
  sectionHeading,
} from "@/lib/site-search-labels";
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

type DisplayGroup = { key: string; heading: string; hits: SiteHit[] };

function buildGroups(hits: SiteHit[], order: SiteHitSection[]): DisplayGroup[] {
  const groups: DisplayGroup[] = [];
  for (const section of order) {
    const sectionHits = hits.filter((h) => h.section === section);
    if (!sectionHits.length) continue;
    if (section === "Heritage") {
      const kindOrder: SiteHitKind[] = ["Kever or tzaddik", "Beis hachaim", "Heritage town"];
      for (const kind of kindOrder) {
        const kindHits = sectionHits.filter((h) => h.kind === kind);
        if (!kindHits.length) continue;
        groups.push({
          key: `${section}-${kind}`,
          heading: heritageKindHeading(kind) ?? sectionHeading(section),
          hits: kindHits,
        });
      }
      continue;
    }
    groups.push({ key: section, heading: sectionHeading(section), hits: sectionHits });
  }
  return groups;
}

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
  const groups = buildGroups(filtered, order);
  const presentKinds = SITE_HIT_KINDS.filter((kind) => results.some((r) => r.kind === kind));

  if (!query) {
    return (
      <div className="rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] px-6 py-10 text-center">
        <Link href="/destinations" className="inline-block text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
          Browse vacation destinations
        </Link>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] px-6 py-10">
        <p className="text-lg text-[var(--navy)]">No results for “{query}”.</p>
        <p className="mt-6 text-sm font-semibold">
          <Link href="/destinations" className="text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
            Browse vacation destinations
          </Link>
        </p>
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
            All
          </FilterChip>
          {presentKinds.map((kind) => {
            return (
              <FilterChip key={kind} active={kindFilter === kind} onClick={() => setKindFilter(kind)}>
                {kindLabel(kind)}
              </FilterChip>
            );
          })}
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`search-section-${group.key}`}>
          <h2
            id={`search-section-${group.key}`}
            className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]"
          >
            {group.heading}
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
                    {kindLabel(hit.kind)}
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
