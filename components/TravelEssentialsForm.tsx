"use client";

import { useActionState, useMemo, useState } from "react";
import { saveTravelEssentialsAction } from "@/app/admin/settings/travel-essentials/actions";
import type { AffiliateConfig } from "@/lib/affiliate/partners";
import {
  describeEssentialService,
  ESSENTIAL_SERVICES,
  type EssentialPageType,
  type EssentialServiceConfig,
  type EssentialServiceId,
  type TravelEssentialsSettings,
} from "@/lib/travel-essentials";

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

const PAGE_OPTIONS: Array<{ value: EssentialPageType; label: string }> = [
  { value: "destination", label: "Destination pages" },
  { value: "itinerary", label: "Itinerary planner" },
  { value: "book", label: "Booking page" },
  { value: "transfers", label: "Transfers page" },
  { value: "things-to-do", label: "Things to do" },
];

export default function TravelEssentialsForm({
  current,
  affiliate,
  storeReady,
}: {
  current: TravelEssentialsSettings;
  affiliate: AffiliateConfig;
  storeReady: boolean;
}) {
  const [settings, setSettings] = useState(current);
  const [state, act, busy] = useActionState(saveTravelEssentialsAction, null);

  const ordered = useMemo(
    () =>
      ESSENTIAL_SERVICES.map((def) => ({ def, cfg: settings.services[def.id] })).sort(
        (a, b) => a.cfg.order - b.cfg.order || a.def.name.localeCompare(b.def.name),
      ),
    [settings],
  );

  const patchService = (id: EssentialServiceId, patch: Partial<EssentialServiceConfig>) => {
    setSettings((prev) => ({
      ...prev,
      services: { ...prev.services, [id]: { ...prev.services[id], ...patch } },
    }));
  };

  const move = (id: EssentialServiceId, direction: -1 | 1) => {
    const ids = ordered.map((row) => row.def.id);
    const index = ids.indexOf(id);
    const swap = index + direction;
    if (index < 0 || swap < 0 || swap >= ids.length) return;
    const nextOrder = { ...settings.services };
    const a = ids[index];
    const b = ids[swap];
    const orderA = nextOrder[a].order;
    nextOrder[a] = { ...nextOrder[a], order: nextOrder[b].order };
    nextOrder[b] = { ...nextOrder[b], order: orderA };
    setSettings((prev) => ({ ...prev, services: nextOrder }));
  };

  const togglePage = (id: EssentialServiceId, page: EssentialPageType) => {
    const currentPages = settings.services[id].pageTypes;
    const next = currentPages.includes(page)
      ? currentPages.filter((p) => p !== page)
      : [...currentPages, page];
    patchService(id, { pageTypes: next });
  };

  return (
    <form action={act} className="mt-6 space-y-8">
      <input type="hidden" name="settings" value={JSON.stringify(settings)} />

      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Changes cannot be
          saved until it is.
        </p>
      )}

      {state && (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
          <input
            type="checkbox"
            checked={settings.sectionEnabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, sectionEnabled: e.target.checked }))}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold text-[var(--navy)]">Show Travel Essentials</span>
            <span className="mt-1 block text-xs leading-5 text-stone-500">
              Master switch. Off hides every card on destination, itinerary and booking pages.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
          <input
            type="checkbox"
            checked={settings.showDisclosure}
            onChange={(e) => setSettings((prev) => ({ ...prev, showDisclosure: e.target.checked }))}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold text-[var(--navy)]">Show commission disclosure</span>
            <span className="mt-1 block text-xs leading-5 text-stone-500">
              Visible sentence above the cards. Full explanation stays in Terms.
            </span>
          </span>
        </label>
      </div>

      {ordered.map(({ def, cfg }, index) => (
        <div key={def.id} className="rounded-lg border border-[var(--gold-light)] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg text-[var(--gold-ink)]" aria-hidden="true">
                {def.icon}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{def.name}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
                {def.linkMode === "landing" ? "Landing link" : "Search hand-off"} ·{" "}
                {def.preferredNetwork === "either"
                  ? "Stay22 or Travelpayouts"
                  : def.preferredNetwork === "stay22"
                    ? "Stay22"
                    : "Travelpayouts"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => move(def.id, -1)}
                disabled={index === 0}
                className="border border-[var(--gold-light)] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] disabled:opacity-40"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => move(def.id, 1)}
                disabled={index === ordered.length - 1}
                className="border border-[var(--gold-light)] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] disabled:opacity-40"
              >
                Down
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm text-[var(--navy)]">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => patchService(def.id, { enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
          </div>

          {def.adminNote && <p className="mt-3 text-sm leading-6 text-stone-600">{def.adminNote}</p>}

          <p className="mt-3 text-xs leading-5 text-stone-500">{describeEssentialService(def.id, settings, affiliate)}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Button words</span>
              <input
                type="text"
                value={cfg.cta}
                onChange={(e) => patchService(def.id, { cta: e.target.value })}
                placeholder={def.cta}
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Line under the title</span>
              <input
                type="text"
                value={cfg.blurb}
                onChange={(e) => patchService(def.id, { blurb: e.target.value })}
                placeholder={def.blurb}
                className={input}
              />
            </label>
          </div>

          {def.linkMode === "landing" && (
            <label className="mt-3 block">
              <span className={label}>Tracked affiliate URL / programme link</span>
              <input
                type="url"
                value={cfg.url}
                onChange={(e) => patchService(def.id, { url: e.target.value })}
                placeholder="https://tp.media/r?marker=…&u=…"
                className={`${input} font-mono text-xs`}
              />
            </label>
          )}

          <fieldset className="mt-4">
            <legend className={label}>Show on</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {PAGE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-[var(--navy)]">
                  <input
                    type="checkbox"
                    checked={cfg.pageTypes.includes(opt.value)}
                    onChange={() => togglePage(def.id, opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-3 block">
            <span className={label}>Destination slugs only (optional)</span>
            <input
              type="text"
              value={cfg.destinations.join(", ")}
              onChange={(e) =>
                patchService(def.id, {
                  destinations: e.target.value
                    .split(",")
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean),
                })
              }
              placeholder="Leave blank for all destinations — e.g. rome, paris"
              className={input}
            />
          </label>
        </div>
      ))}

      <button
        type="submit"
        disabled={busy || !storeReady}
        className="min-h-11 border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save Travel Essentials"}
      </button>
    </form>
  );
}
