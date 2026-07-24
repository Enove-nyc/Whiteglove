"use client";

import { useMemo, useState } from "react";
import SectionPlaceholder from "@/components/SectionPlaceholder";
import type { Promotion, PromotionPlacement } from "@/lib/admin-content";

const placementOptions: Array<{ value: PromotionPlacement; label: string }> = [
  { value: "popup", label: "Popup" },
  { value: "fixed-top-banner", label: "Fixed top banner" },
  { value: "sticky-bottom-banner", label: "Sticky bottom banner" },
  { value: "homepage-promo", label: "Homepage promotion" },
  { value: "inline-content", label: "Inline content" },
  { value: "sidebar", label: "Sidebar" },
  { value: "destination-specific", label: "Destination page" },
  { value: "accommodation-page", label: "Accommodation page" },
  { value: "sponsored-listing", label: "Sponsored listing" },
  { value: "full-page-takeover", label: "Full-page takeover" },
];

function emptyPromotion(): Promotion {
  const now = new Date().toISOString();
  return {
    id: "",
    title: "",
    description: "",
    buttonText: "Learn more",
    targetHref: "/",
    imageUrl: "",
    pdfUrl: "",
    placements: ["homepage-promo"],
    targetPaths: "/",
    device: "all",
    startDate: "",
    endDate: "",
    priority: 0,
    maxViewsPerVisitor: 3,
    enabled: false,
    impressions: 0,
    clicks: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function statusLabel(promotion: Promotion) {
  if (!promotion.enabled) return "Paused";
  if (promotion.placements.includes("full-page-takeover")) return "Fullscreen";
  if (promotion.placements.includes("popup")) return "Popup";
  return "Live";
}

export default function AdminPromotionsManager({
  initialPromotions,
  configured,
}: {
  initialPromotions: Promotion[];
  configured: boolean;
}) {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [draft, setDraft] = useState<Promotion>(emptyPromotion());
  const [message, setMessage] = useState(configured ? "" : "Connect the private database before editing promotions.");
  const [saving, setSaving] = useState(false);
  const totals = useMemo(() => ({
    impressions: promotions.reduce((total, item) => total + item.impressions, 0),
    clicks: promotions.reduce((total, item) => total + item.clicks, 0),
    enabled: promotions.filter((item) => item.enabled).length,
  }), [promotions]);

  async function savePromotion(nextPromotion: Promotion) {
    if (!configured) {
      setMessage("Connect the private database before editing promotions.");
      return;
    }
    setSaving(true);
    setMessage("Saving...");
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "promotion", data: nextPromotion }),
    });
    const next = await response.json().catch(() => null) as { bundle?: { promotions?: Promotion[] }; error?: string } | null;
    setSaving(false);
    if (!response.ok || !next?.bundle?.promotions) {
      setMessage(next?.error || "The promotion could not be saved.");
      return;
    }
    setPromotions(next.bundle.promotions);
    setMessage("Promotion saved.");
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Promotions" value={promotions.length} />
        <Stat label="Enabled" value={totals.enabled} />
        <Stat label="Impressions" value={totals.impressions} />
        <Stat label="Clicks" value={totals.clicks} />
      </div>

      <div className="mt-6 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Create or update a promotion</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">Choose where it appears, which pages it targets, and whether it should act like a banner, popup, or full-page takeover.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="ID" value={draft.id} onChange={(value) => setDraft((current) => ({ ...current, id: value }))} />
          <Field label="Title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <Field label="Button text" value={draft.buttonText} onChange={(value) => setDraft((current) => ({ ...current, buttonText: value }))} />
          <Field label="Target link" value={draft.targetHref} onChange={(value) => setDraft((current) => ({ ...current, targetHref: value }))} />
          <Field label="Image URL" value={draft.imageUrl} onChange={(value) => setDraft((current) => ({ ...current, imageUrl: value }))} />
          <Field label="PDF URL" value={draft.pdfUrl} onChange={(value) => setDraft((current) => ({ ...current, pdfUrl: value }))} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Description" value={draft.description} onChange={(value) => setDraft((current) => ({ ...current, description: value }))} textarea />
          <Field label="Target pages" value={draft.targetPaths} onChange={(value) => setDraft((current) => ({ ...current, targetPaths: value }))} textarea />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Device
            <select value={draft.device} onChange={(event) => setDraft((current) => ({ ...current, device: event.target.value as Promotion["device"] }))} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm">
              <option value="all">All</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </label>
          <Field label="Start date" value={draft.startDate} onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))} />
          <Field label="End date" value={draft.endDate} onChange={(value) => setDraft((current) => ({ ...current, endDate: value }))} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Priority
            <input type="number" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) }))} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Max views per visitor
            <input type="number" value={draft.maxViewsPerVisitor} onChange={(event) => setDraft((current) => ({ ...current, maxViewsPerVisitor: Number(event.target.value) }))} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
          </label>
          <label className="flex items-end gap-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4" />
            Enabled
          </label>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">Placements</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {placementOptions.map((placement) => (
              <label key={placement.value} className="flex items-center gap-2 border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={draft.placements.includes(placement.value)}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    placements: event.target.checked
                      ? [...current.placements, placement.value]
                      : current.placements.filter((item) => item !== placement.value),
                  }))}
                  className="h-4 w-4"
                />
                {placement.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={() => savePromotion(draft)} className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] disabled:opacity-60">Save promotion</button>
          <button type="button" onClick={() => setDraft(emptyPromotion())} className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Reset form</button>
        </div>
      </div>

      {message && <p className="mt-4 text-sm leading-6 text-stone-600">{message}</p>}

      <div className="mt-8 grid gap-4">
        {promotions.length === 0 ? (
          <SectionPlaceholder title="No promotions yet" description="Add the first banner, popup, or takeover campaign using the form above." />
        ) : promotions.map((promotion) => (
          <article key={promotion.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{statusLabel(promotion)}</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{promotion.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{promotion.description}</p>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.12em] text-stone-500">
                <p>{promotion.device}</p>
                <p className="mt-1">{promotion.placements.join(", ")}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-600">
              <span>Impressions: {promotion.impressions}</span>
              <span>Clicks: {promotion.clicks}</span>
              <span>Priority: {promotion.priority}</span>
              <span>Target pages: {promotion.targetPaths || "All"}</span>
              <span>Target: {promotion.targetHref}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setDraft(promotion)} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Edit</button>
              <button type="button" onClick={() => savePromotion({ ...promotion, enabled: !promotion.enabled })} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
                {promotion.enabled ? "Pause" : "Enable"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  const className = "mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none";
  return (
    <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
      {label}
      {textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={className} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />}
    </label>
  );
}
