"use client";

import { useMemo, useState } from "react";
import SuggestEditButton from "@/components/SuggestEditButton";
import { PROVIDER_CATEGORY_LABELS, PROVIDER_CATEGORY_ORDER, type ProviderCat, type PublicProvider } from "@/lib/directory";

const telHref = (value: string) => `tel:${value.replace(/[^+\d]/g, "")}`;
const waHref = (value: string) => `https://wa.me/${value.replace(/[^\d]/g, "")}`;

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-block border border-[var(--gold-light)] bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600">{children}</span>;
}

export default function DirectoryBrowser({
  providers,
  featuredNote = null,
}: {
  providers: PublicProvider[];
  /**
   * What "Featured" means here, in the owner's words. Without it, the star is
   * not shown at all — an unexplained promotional badge leaves a visitor
   * unable to tell whether a listing was chosen because it is good or because
   * somebody paid. See lib/features.ts.
   */
  featuredNote?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProviderCat | "ALL">("ALL");
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("");
  const [specialty, setSpecialty] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: providers.length };
    for (const category of PROVIDER_CATEGORY_ORDER) map[category] = 0;
    for (const provider of providers) map[provider.category] = (map[provider.category] ?? 0) + 1;
    return map;
  }, [providers]);

  // Regions, languages and specialties were on every record and shown on
  // none of them — you could not find "somebody in Ukraine who speaks
  // Yiddish", which is the question the directory exists to answer.
  const options = useMemo(() => {
    const collect = (pick: (p: PublicProvider) => string[]) =>
      [...new Set(providers.flatMap(pick).map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return {
      regions: collect((p) => p.regions),
      languages: collect((p) => p.languages),
      specialties: collect((p) => p.specialties),
    };
  }, [providers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (category !== "ALL" && p.category !== category) return false;
      if (region && !p.regions.includes(region)) return false;
      if (language && !p.languages.includes(language)) return false;
      if (specialty && !p.specialties.includes(specialty)) return false;
      if (!q) return true;
      const haystack = [p.name, p.tagline, p.description, p.basedIn, ...p.regions, ...p.specialties, ...p.languages]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [providers, query, category, region, language, specialty]);

  const tabs: Array<{ key: ProviderCat | "ALL"; label: string }> = [
    { key: "ALL", label: "All" },
    ...PROVIDER_CATEGORY_ORDER.map((key) => ({ key, label: PROVIDER_CATEGORY_LABELS[key].english })),
  ];

  return (
    <div>
      <div className="flex flex-col gap-4">
        <input
          type="search"
          aria-label="Search the provider directory"
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
                className={`min-h-11 border px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition ${
                  active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                }`}
              >
                {tab.label} <span className={active ? "text-[var(--gold-light)]" : "text-stone-400"}>({counts[tab.key] ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Only offered when there is something to choose between — a select
          with one option in it is furniture, not a filter. */}
      {(options.regions.length > 1 || options.languages.length > 1 || options.specialties.length > 1) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {options.regions.length > 1 && (
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
              Works in
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1.5 block min-h-11 w-full min-w-48 rounded-md border border-[var(--gold-light)] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[var(--navy)]">
                <option value="">Anywhere</option>
                {options.regions.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
          {options.languages.length > 1 && (
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
              Speaks
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 block min-h-11 w-full min-w-48 rounded-md border border-[var(--gold-light)] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[var(--navy)]">
                <option value="">Any language</option>
                {options.languages.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
          {options.specialties.length > 1 && (
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
              Specialises in
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="mt-1.5 block min-h-11 w-full min-w-48 rounded-md border border-[var(--gold-light)] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[var(--navy)]">
                <option value="">Anything</option>
                {options.specialties.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500" role="status">{filtered.length} {filtered.length === 1 ? "provider" : "providers"}</p>
        {(region || language || specialty || category !== "ALL" || query) && (
          <button
            type="button"
            onClick={() => { setQuery(""); setCategory("ALL"); setRegion(""); setLanguage(""); setSpecialty(""); }}
            className="inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Said once, plainly, above the listings — not buried in a tooltip on
          one badge. */}
      {featuredNote && (
        <p className="mt-3 rounded-md border-l-4 border-[var(--gold)] bg-[var(--cream)] px-3 py-2 text-xs leading-5 text-stone-600">
          <strong className="text-[var(--navy)]">About ★ Featured:</strong> {featuredNote}
        </p>
      )}

      <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <article key={p.slug} className="wg-card flex flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{PROVIDER_CATEGORY_LABELS[p.category].english}</p>
              {p.featured && featuredNote && (
                <span title={featuredNote} className="shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--navy)]">★ Featured</span>
              )}
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

            {p.languages.length > 0 && (
              <p className="mt-2 text-xs text-stone-500">Speaks: {p.languages.join(", ")}.</p>
            )}

            {p.specialties.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.specialties.map((s) => <Tag key={s}>{s}</Tag>)}
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {p.phone && <a href={telHref(p.phone)} className="inline-flex min-h-11 items-center border border-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Call</a>}
              {p.whatsapp && <a href={waHref(p.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">WhatsApp</a>}
              {p.email && <a href={`mailto:${p.email}`} className="inline-flex min-h-11 items-center border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Email</a>}
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center border border-[var(--gold-light)] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Website ↗</a>}
            </div>

            {/* A phone number that has stopped working is worse than no number
                — somebody stands at a kever ringing it. This is how that gets
                back to us; the suggestion goes to the admin queue for review,
                the same as a destination correction. */}
            <SuggestEditButton
              targetType="directory"
              targetId={p.slug}
              title={p.name}
              currentInfo={[p.phone, p.whatsapp, p.email, p.website].filter(Boolean).join(" · ")}
            />
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
