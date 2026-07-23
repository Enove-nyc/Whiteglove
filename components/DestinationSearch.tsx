"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cityGuides } from "@/data/city-guides";
import { sacredStops } from "@/data/sacred-stops";

type SearchMatch = {
  id: string;
  title: string;
  yiddish: string;
  subtitle: string;
  aliases?: string[];
  href: string;
  kind: "Guide" | "Location";
};

const featuredMatches: SearchMatch[] = [
  {
    id: "lizensk",
    title: "Lizhensk",
    yiddish: "ליזענסק",
    subtitle: "Reb Elimelech of Lizhensk · Poland",
    aliases: ["Lizensk", "Lezajsk", "Leżajsk", "ליז'ענסק"],
    href: "/lizensk",
    kind: "Guide",
  },
  ...cityGuides.map((guide) => ({
    id: guide.slug,
    title: guide.city,
    yiddish: guide.yiddishCity,
    subtitle: `${guide.tzaddik} · ${guide.country}`,
    aliases: guide.aliases,
    href: `/${guide.slug}`,
    kind: "Guide" as const,
  })),
];

export default function DestinationSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return featuredMatches.slice(0, 5);

    const guideMatches = featuredMatches.filter((match) => `${match.title} ${match.yiddish} ${match.subtitle} ${match.aliases?.join(" ") ?? ""}`.toLowerCase().includes(normalized));
    const stopMatches = sacredStops
      .filter((stop) => `${stop.city} ${stop.traditionalName ?? ""} ${stop.yiddishName} ${stop.country} ${stop.address} ${stop.aliases?.join(" ") ?? ""}`.toLowerCase().includes(normalized))
      .map((stop) => ({
        id: `stop-${stop.city}-${stop.address}`,
        title: stop.city,
        yiddish: stop.yiddishName,
        subtitle: `${stop.traditionalName ? `${stop.traditionalName} · ` : ""}${stop.country}`,
        href: `/stops?q=${encodeURIComponent(stop.city)}`,
        kind: "Location" as const,
      }));

    return [...guideMatches, ...stopMatches.filter((stop) => !guideMatches.some((guide) => guide.title === stop.title))].slice(0, 6);
  }, [query]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (matches[0] && query.trim()) {
      router.push(matches[0].href);
    } else {
      router.push(`/stops${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    }
    setOpen(false);
  }

  return (
    <div className={`relative ${compact ? "w-full" : "mt-12 max-w-3xl"}`}>
      <form className={`flex flex-col gap-2 border border-[var(--gold-light)] bg-[#fcfaf6] shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:flex-row ${compact ? "p-2" : "p-3"}`} onSubmit={submitSearch}>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          className={`min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-stone-400 ${compact ? "py-2 text-sm" : "py-3"}`}
          aria-label="Destination search"
          placeholder="Search a city, tzaddik, or country..."
          autoComplete="off"
        />
        <button className={`bg-[var(--navy)] text-sm font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] ${compact ? "px-4 py-2 text-xs" : "px-7 py-3"}`} type="submit">{compact ? "Search" : "Explore"}</button>
      </form>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden border border-[var(--gold-light)] bg-[#fcfaf6] shadow-xl">
          {matches.length > 0 ? matches.map((match) => (
            <button
              key={match.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { router.push(match.href); setOpen(false); }}
              className="flex w-full items-center justify-between gap-5 border-b border-[var(--gold-light)] px-5 py-4 text-left last:border-b-0 transition hover:bg-[var(--cream-deep)]"
            >
              <span><span className="block font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{match.title}<span className="ml-2 text-base text-stone-500">{match.yiddish}</span></span><span className="mt-1 block text-sm text-stone-600">{match.subtitle}</span></span>
              <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{match.kind}</span>
            </button>
          )) : <p className="px-5 py-4 text-sm text-stone-600">No match yet. Press Enter to search the full directory.</p>}
        </div>
      )}
    </div>
  );
}
