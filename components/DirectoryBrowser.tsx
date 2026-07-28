"use client";

import { useMemo, useState } from "react";
import { PROVIDER_CATEGORY_LABELS, PROVIDER_CATEGORY_ORDER, type ProviderCat, type PublicProvider } from "@/lib/directory";

const telHref = (value: string) => `tel:${value.replace(/[^+\d]/g, "")}`;
const waHref = (value: string) => `https://wa.me/${value.replace(/[^\d]/g, "")}`;

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-block border border-[var(--gold-light)] bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600">{children}</span>;
}

export default function DirectoryBrowser({ providers }: { providers: PublicProvider[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProviderCat | "ALL">("ALL");

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: providers.length };
    for (const category of PROVIDER_CATEGORY_ORDER) map[category] = 0;
    for (const provider of providers) map[provider.category] = (map[provider.category] ?? 0) + 1;
    return map;
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (category !== "ALL" && p.category !== category) return false;
      if (!q) return true;
      const haystack = [p.name, p.tagline, p.description, p.basedIn, ...p.regions, ...p.specialties, ...p.languages]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [providers, query, category]);

  const tabs: Array<{ key: ProviderCat | "ALL"; label: string }> = [
    { key: "ALL", label: "All" },
    ...PROVIDER_CATEGORY_ORDER.map((key) => ({ key, label: PROVIDER_CATEGORY_LABELS[key].english })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, region, or specialty (e.g. Uman, Poland, honeymoon)…"
          className="w-full rounded-md border border-[var(--gold-light)] bg-white px-4 py-3 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
        />
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = category === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategory(tab.key)}
                className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                  active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                }`}
              >
                {tab.label} <span className={active ? "text-[var(--gold-light)]" : "text-stone-400"}>({counts[tab.key] ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-sm text-stone-500">{filtered.length} {filtered.length === 1 ? "provider" : "providers"}</p>

      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <article key={p.slug} className="wg-card flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{PROVIDER_CATEGORY_LABELS[p.category].english}</p>
              {p.featured && <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">★ Featured</span>}
            </div>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{p.name}</h3>
            {p.tagline && <p className="mt-1 text-sm font-semibold text-stone-500">{p.tagline}</p>}
            {p.description && <p className="mt-3 text-sm leading-6 text-stone-600">{p.description}</p>}

            {(p.basedIn || p.regions.length > 0) && (
              <p className="mt-3 text-xs text-stone-500">
                {p.basedIn && <>Based in {p.basedIn}. </>}
                {p.regions.length > 0 && <>Serves: {p.regions.join(", ")}.</>}
              </p>
            )}

            {p.specialties.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.specialties.map((s) => <Tag key={s}>{s}</Tag>)}
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {p.phone && <a href={telHref(p.phone)} className="border border-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Call</a>}
              {p.whatsapp && <a href={waHref(p.whatsapp)} target="_blank" rel="noreferrer" className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">WhatsApp</a>}
              {p.email && <a href={`mailto:${p.email}`} className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Email</a>}
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Website ↗</a>}
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-6 border border-dashed border-[var(--gold-light)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">No providers match your search.</p>
          <p className="mt-2 text-sm text-stone-600">Try a different word, or clear the filter.</p>
        </div>
      )}
    </div>
  );
}
