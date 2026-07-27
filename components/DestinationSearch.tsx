"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BilingualLabel from "@/components/BilingualLabel";
import { cityGuides } from "@/data/city-guides";
import { bulkDestinations } from "@/data/bulk-destinations";
import { sacredStops } from "@/data/sacred-stops";
import { extraSpellings, fuzzyMatch } from "@/lib/place-search";

type SearchMatch = {
  id: string;
  title: string;
  yiddish: string;
  subtitle: string;
  yiddishSubtitle?: string;
  aliases?: string[];
  href: string;
  kind: "Guide" | "Location";
};

const featuredMatches: SearchMatch[] = [
  {
    id: "lizensk",
    title: "Lizhensk",
    yiddish: "ליזענסק",
    subtitle: "Reb Elimelech of Lizhensk - Poland",
    yiddishSubtitle: "רבי אלימלך מליזענסק",
    aliases: ["Lizensk", "Lezajsk", "Leżajsk", "ליז'ענסק"],
    href: "/lizensk",
    kind: "Guide",
  },
  ...cityGuides.map((guide) => ({
    id: guide.slug,
    title: guide.city,
    yiddish: guide.yiddishCity,
    subtitle: `${guide.tzaddik} - ${guide.country}`,
    yiddishSubtitle: guide.yiddishTzaddik,
    aliases: guide.aliases,
    href: `/${guide.slug}`,
    kind: "Guide" as const,
  })),
  ...bulkDestinations.map((destination) => ({
    id: `directory-${destination.slug}`,
    title: destination.city,
    yiddish: destination.yiddishCity,
    subtitle: `${destination.country} - Directory entry`,
    yiddishSubtitle: undefined,
    aliases: destination.aliases,
    href: `/destinations/${destination.slug}`,
    kind: "Location" as const,
  })),
];

export default function DestinationSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return featuredMatches.slice(0, 5);

    const guideMatches = featuredMatches.filter((match) =>
      fuzzyMatch(normalized, `${match.title} ${match.yiddish} ${match.subtitle} ${match.aliases?.join(" ") ?? ""} ${extraSpellings([match.id, match.title])}`),
    );
    const stopMatches = sacredStops
      .filter((stop) => fuzzyMatch(normalized, `${stop.city} ${stop.traditionalName ?? ""} ${stop.yiddishName} ${stop.country} ${stop.address} ${stop.aliases?.join(" ") ?? ""} ${extraSpellings([stop.city, stop.traditionalName])}`))
      .map((stop) => ({
        id: `stop-${stop.city}-${stop.address}`,
        title: stop.city,
        yiddish: stop.yiddishName,
        subtitle: `${stop.traditionalName ? `${stop.traditionalName} - ` : ""}${stop.country}`,
        yiddishSubtitle: undefined,
        href: `/stops?q=${encodeURIComponent(stop.city)}`,
        kind: "Location" as const,
      }));

    return [...guideMatches, ...stopMatches.filter((stop) => !guideMatches.some((guide) => guide.title === stop.title))].slice(0, 6);
  }, [query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) {
      void fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "search", value: query.trim() }),
        keepalive: true,
      });
    }
    if (matches[0] && query.trim()) router.push(matches[0].href);
    else router.push(`/stops${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    setOpen(false);
  }

  return (
    <div className={`relative ${compact ? "w-full" : "mt-12 max-w-3xl"}`}>
      <form className={`flex flex-col gap-2 border border-[var(--gold-light)] bg-[#fcfaf6] shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:flex-row ${compact ? "p-2" : "p-3"}`} onSubmit={submitSearch}>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className={`min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-stone-400 ${compact ? "py-2 text-sm" : "py-3"}`}
          aria-label="Destination search"
          placeholder="Search a city, tzaddik, or country..."
          autoComplete="off"
        />
        <button className={`bg-[var(--navy)] text-sm font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] ${compact ? "px-4 py-2 text-xs" : "px-7 py-3"}`} type="submit">
          {compact ? "Search" : "Explore"}
        </button>
      </form>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden border border-[var(--gold-light)] bg-[#fcfaf6] shadow-xl">
          {matches.length > 0 ? (
            matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (query.trim()) {
                    void fetch("/api/analytics", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type: "search", value: query.trim() }),
                      keepalive: true,
                    });
                  }
                  router.push(match.href);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-5 border-b border-[var(--gold-light)] px-5 py-4 text-left last:border-b-0 transition hover:bg-[var(--cream-deep)]"
              >
                <div>
                  <BilingualLabel
                    primary={match.yiddish}
                    secondary={match.title}
                    primaryClassName="text-3xl"
                    secondaryClassName="text-base"
                    compact
                  />
                  <p className="mt-2 text-sm leading-6 text-stone-600">{match.yiddishSubtitle ?? match.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{match.kind}</span>
              </button>
            ))
          ) : (
            <p className="px-5 py-4 text-sm text-stone-600">No match yet. Press Enter to search the full directory.</p>
          )}
        </div>
      )}
    </div>
  );
}
