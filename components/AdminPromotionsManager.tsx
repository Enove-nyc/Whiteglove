"use client";

import { useMemo, useState } from "react";
import SectionPlaceholder from "@/components/SectionPlaceholder";
import type { Promotion, PromotionPlacement } from "@/lib/admin-content";

const placementOptions: Array<{ value: PromotionPlacement; label: string }> = [
  { value: "fixed-top-banner", label: "Fixed top banner — shows on every page" },
  { value: "popup", label: "Popup — shows on every page (once per visit)" },
  { value: "sticky-bottom-banner", label: "Sticky bottom banner — shows on every page" },
  { value: "homepage-promo", label: "Homepage promotion — home page only" },
  { value: "inline-content", label: "Inline content — home page only" },
  { value: "sidebar", label: "Sidebar — not shown yet" },
  { value: "destination-specific", label: "Destination page — not shown yet" },
  { value: "accommodation-page", label: "Accommodation page — not shown yet" },
  { value: "sponsored-listing", label: "Sponsored listing — not shown yet" },
  { value: "full-page-takeover", label: "Full-page takeover — not shown yet" },
];

// Friendly page/section list for the "Show on" dropdown. Empty value = all pages.
const PAGE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "All pages", value: "" },
  { label: "Home page", value: "/" },
  { label: "Destinations (hub)", value: "/stops" },
  { label: "Kosher getaways", value: "/getaways" },
  { label: "Cemeteries", value: "/cemeteries" },
  { label: "Directory", value: "/directory" },
  { label: "Services", value: "/services" },
  { label: "Trip planning", value: "/planning" },
  { label: "Honeymoon", value: "/honeymoon" },
  { label: "Book flights, hotels & cars", value: "/book" },
  { label: "Phone & SIM rentals", value: "/phone-rentals" },
  { label: "Travel insurance", value: "/travel-insurance" },
  { label: "Contact", value: "/contact" },
  { label: "Lizhensk", value: "/lizensk" },
  { label: "Uman", value: "/uman" },
  { label: "Medzhybizh", value: "/medzhybizh" },
  { label: "Belz", value: "/belz" },
  { label: "Kerestir", value: "/kerestir" },
  { label: "Munkatch", value: "/munkatch" },
  { label: "Sanz", value: "/sanz" },
  { label: "Preshburg", value: "/preshburg" },
  { label: "Custom pages…", value: "__custom__" },
];
const KNOWN_PAGE_VALUES = new Set(PAGE_OPTIONS.filter((o) => o.value !== "__custom__").map((o) => o.value));
const isCustomTarget = (targetPaths: string) => {
  const value = targetPaths.trim();
  return value !== "" && !KNOWN_PAGE_VALUES.has(value);
};

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
    placements: ["fixed-top-banner"],
    targetPaths: "",
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
  const [uploading, setUploading] = useState<"image" | "pdf" | null>(null);
  const [customTargets, setCustomTargets] = useState(isCustomTarget(emptyPromotion().targetPaths));

  async function uploadMedia(file: File, kind: "image" | "pdf") {
    const typeOk = kind === "image" ? file.type.startsWith("image/") : file.type === "application/pdf";
    if (!typeOk) {
      setMessage(kind === "image" ? "Choose an image file (PNG, JPG, WEBP, or GIF)." : "Choose a PDF file.");
      return;
    }
    if (file.size > 900 * 1024) {
      setMessage("That file is too large (max ~900 KB). Compress it and try again.");
      return;
    }
    setUploading(kind);
    setMessage("Uploading…");
    const dataUrl: string = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataUrl) {
      setUploading(null);
      setMessage("Could not read that file.");
      return;
    }
    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });
    const data = await response.json().catch(() => ({}));
    setUploading(null);
    if (!response.ok || !data.url) {
      setMessage(data.error || "Upload failed.");
      return;
    }
    setDraft((current) => (kind === "image" ? { ...current, imageUrl: data.url } : { ...current, pdfUrl: data.url }));
    setMessage(kind === "image" ? "Image uploaded." : "PDF uploaded.");
  }
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
          <Field label="Title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
          <Field label="Button text" value={draft.buttonText} onChange={(value) => setDraft((current) => ({ ...current, buttonText: value }))} />
          <Field label="Target link" value={draft.targetHref} onChange={(value) => setDraft((current) => ({ ...current, targetHref: value }))} />
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Image
            <input value={draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Upload below, or paste an image URL" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
            <label className="mt-2 inline-block cursor-pointer border border-[var(--gold)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">
              {uploading === "image" ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia(file, "image"); event.target.value = ""; }} />
            </label>
            {draft.imageUrl ? <img src={draft.imageUrl} alt="" className="mt-2 h-20 w-auto max-w-full border border-[var(--gold-light)] object-contain" /> : null}
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            PDF
            <input value={draft.pdfUrl} onChange={(event) => setDraft((current) => ({ ...current, pdfUrl: event.target.value }))} placeholder="Upload below, or paste a PDF URL" className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
            <label className="mt-2 inline-block cursor-pointer border border-[var(--gold)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">
              {uploading === "pdf" ? "Uploading…" : "Upload PDF"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia(file, "pdf"); event.target.value = ""; }} />
            </label>
            {draft.pdfUrl ? <p className="mt-2 truncate text-[11px] font-normal normal-case text-stone-500">Attached: {draft.pdfUrl}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Description" value={draft.description} onChange={(value) => setDraft((current) => ({ ...current, description: value }))} textarea />
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Show on which page
            <select
              value={customTargets ? "__custom__" : draft.targetPaths.trim()}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "__custom__") { setCustomTargets(true); }
                else { setCustomTargets(false); setDraft((current) => ({ ...current, targetPaths: value })); }
              }}
              className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-stone-700"
            >
              {PAGE_OPTIONS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
            </select>
            {customTargets && (
              <textarea
                value={draft.targetPaths}
                onChange={(event) => setDraft((current) => ({ ...current, targetPaths: event.target.value }))}
                rows={3}
                placeholder="One page path per line, e.g. /uman"
                className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-stone-700 outline-none"
              />
            )}
            <p className="mt-2 text-[11px] font-normal normal-case tracking-normal text-stone-500">Pick a page, or &quot;All pages&quot; to show it everywhere.</p>
          </div>
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
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Start date (optional)
            <input type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-stone-700 outline-none" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            End date (optional)
            <input type="date" value={draft.endDate} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-stone-700 outline-none" />
          </label>
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
          <p className="mt-2 text-sm leading-6 text-stone-600">To make an ad appear, pick <strong>Fixed top banner</strong>, <strong>Popup</strong>, or <strong>Sticky bottom banner</strong>, check <strong>Enabled</strong> below, and set <strong>Max views per visitor</strong> to 0 while testing. Then view the public site (ads don&apos;t show inside the admin area).</p>
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
          <button type="button" onClick={() => { setDraft(emptyPromotion()); setCustomTargets(false); }} className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Reset form</button>
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
              <button type="button" onClick={() => { setDraft(promotion); setCustomTargets(isCustomTarget(promotion.targetPaths)); }} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Edit</button>
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
