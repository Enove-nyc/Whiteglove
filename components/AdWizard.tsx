"use client";

import Image from "next/image";
import { useState } from "react";
import { AD_KINDS, SPOTS_BY_KIND, type AdKind, readAd, writeAd } from "@/lib/ad-types";
import type { Promotion, PromotionDevice, PromotionPlacement } from "@/lib/admin-content";

// Making an advertisement, one question at a time.
//
// The old form asked twenty things on one screen, including priority numbers
// and internal placement identifiers. Five steps ask what the owner actually
// decides: what kind, what it says, where it goes, when it runs, and does it
// look right. Everything else has a sensible default and lives under Advanced.

const PAGE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Every page", value: "" },
  { label: "The home page", value: "/" },
  { label: "Destinations", value: "/stops" },
  { label: "Kosher getaways", value: "/getaways" },
  { label: "Batei hachaim", value: "/cemeteries" },
  { label: "Directory", value: "/directory" },
  { label: "Services", value: "/services" },
  { label: "Trip planning", value: "/planning" },
  { label: "Honeymoon", value: "/honeymoon" },
  { label: "Book flights, hotels & cars", value: "/book" },
  { label: "Phone & SIM rentals", value: "/phone-rentals" },
  { label: "Travel insurance", value: "/travel-insurance" },
  { label: "Contact", value: "/contact" },
  { label: "The itinerary planner", value: "/itinerary" },
];

const STEPS = ["What kind", "What it says", "Where", "When", "Check it"] as const;

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-[#fcfaf6] px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const primaryClass =
  "min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60";
const secondaryClass =
  "min-h-[44px] border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]";

function Choice({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full flex-col border p-5 text-left transition ${
        selected
          ? "border-[var(--navy)] bg-[var(--cream-deep)]"
          : "border-[var(--gold-light)] bg-[#fcfaf6] hover:border-[var(--gold)]"
      }`}
    >
      <span className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">{title}</span>
      {detail && <span className="mt-1.5 text-sm leading-6 text-stone-600">{detail}</span>}
    </button>
  );
}

/** What the advertisement will actually look like. */
function Preview({ ad, narrow }: { ad: Promotion; narrow: boolean }) {
  return (
    <div
      className={`mx-auto border border-[var(--gold-light)] bg-white ${narrow ? "w-[320px]" : "w-full max-w-2xl"}`}
      aria-label={narrow ? "How it looks on a phone" : "How it looks on a computer"}
    >
      <div className="border-b border-[var(--gold-light)] bg-[#fcfaf6] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
        {narrow ? "On a phone" : "On a computer"}
      </div>
      <div className={`flex gap-4 p-4 ${narrow ? "flex-col" : "items-center"}`}>
        {ad.imageUrl ? (
          <Image
            src={ad.imageUrl}
            alt=""
            width={narrow ? 288 : 160}
            height={narrow ? 160 : 100}
            unoptimized
            className={`${narrow ? "h-40 w-full" : "h-24 w-40"} shrink-0 border border-[var(--gold-light)] object-cover`}
          />
        ) : null}
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
            {ad.title || "Your headline goes here"}
          </p>
          {ad.description && <p className="mt-1 text-sm leading-6 text-stone-600">{ad.description}</p>}
          <span className="mt-3 inline-block border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
            {ad.buttonText || "Learn more"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdWizard({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Promotion;
  onSave: (ad: Promotion, publish: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const start = readAd(initial.placements);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<AdKind>(start.kind);
  const [spot, setSpot] = useState<PromotionPlacement>(start.spot);
  const [ad, setAd] = useState<Promotion>(initial);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = (patch: Partial<Promotion>) => {
    setAd((prev) => ({ ...prev, ...patch }));
    setTouched(true);
  };

  const spots = SPOTS_BY_KIND[kind];
  const problems: string[] = [];
  if (!ad.title.trim()) problems.push("Give it a headline — that is the line people read.");
  if (!ad.targetHref.trim()) problems.push("Say where the button should take them.");

  function finish(publish: boolean) {
    onSave({ ...ad, placements: writeAd(kind, spot), enabled: publish }, publish);
  }

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`min-h-[36px] border px-3 text-xs font-bold uppercase tracking-[0.1em] transition ${
                i === step
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                  : i < step
                    ? "border-[var(--gold)] text-[var(--navy)]"
                    : "border-[var(--gold-light)] text-stone-400"
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        {step === 0 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              What kind of advertisement?
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {AD_KINDS.map((k) => (
                <Choice
                  key={k.value}
                  selected={kind === k.value}
                  title={k.label}
                  detail={k.detail}
                  onClick={() => {
                    setKind(k.value);
                    setSpot(SPOTS_BY_KIND[k.value][0].value);
                    setTouched(true);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">What does it say?</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={captionClass}>Headline *</span>
                <input value={ad.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} placeholder="Kosher Pesach in Kraków" />
              </label>
              <label className="block sm:col-span-2">
                <span className={captionClass}>A line underneath</span>
                <textarea value={ad.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={inputClass} />
              </label>
              <label className="block">
                <span className={captionClass}>Button says</span>
                <input value={ad.buttonText} onChange={(e) => set({ buttonText: e.target.value })} className={inputClass} placeholder="Learn more" />
              </label>
              <label className="block">
                <span className={captionClass}>Button goes to *</span>
                <input value={ad.targetHref} onChange={(e) => set({ targetHref: e.target.value })} className={inputClass} placeholder="/getaways or https://…" />
              </label>
              <label className="block sm:col-span-2">
                <span className={captionClass}>Picture</span>
                <input value={ad.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} className={inputClass} placeholder="Paste a picture address, or upload one below" />
              </label>
              <label className="block sm:col-span-2">
                <span className={captionClass}>A PDF to open instead</span>
                <input value={ad.pdfUrl} onChange={(e) => set({ pdfUrl: e.target.value })} className={inputClass} placeholder="Optional" />
              </label>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Where should it show?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {spots.map((s) => (
                <Choice key={s.value} selected={spot === s.value} title={s.label} detail={s.detail} onClick={() => { setSpot(s.value); setTouched(true); }} />
              ))}
            </div>

            {(kind === "banner" || kind === "popup") && (
              <label className="mt-6 block max-w-sm">
                <span className={captionClass}>On which pages?</span>
                <select value={ad.targetPaths} onChange={(e) => set({ targetPaths: e.target.value })} className={inputClass}>
                  {PAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">When should it run?</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Leave the dates empty and it runs until you stop it.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className={captionClass}>Who sees it</span>
                <select value={ad.device} onChange={(e) => set({ device: e.target.value as PromotionDevice })} className={inputClass}>
                  <option value="all">Everyone</option>
                  <option value="mobile">Only on phones</option>
                  <option value="desktop">Only on computers</option>
                </select>
              </label>
              <label className="block">
                <span className={captionClass}>Starts</span>
                <input type="date" value={ad.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={captionClass}>Ends</span>
                <input type="date" value={ad.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputClass} />
              </label>
            </div>

            <div className="mt-6 border-t border-[var(--gold-light)] pt-4">
              <button type="button" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced} className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
                {showAdvanced ? "Hide" : "Show"} advanced options
              </button>
              {showAdvanced && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={captionClass}>How often one person sees it</span>
                    <input type="number" min={0} value={ad.maxViewsPerVisitor} onChange={(e) => set({ maxViewsPerVisitor: Number(e.target.value) })} className={inputClass} />
                    <span className="mt-1 block text-xs text-stone-500">0 means no limit.</span>
                  </label>
                  <label className="block">
                    <span className={captionClass}>Order against other advertisements</span>
                    <input type="number" value={ad.priority} onChange={(e) => set({ priority: Number(e.target.value) })} className={inputClass} />
                    <span className="mt-1 block text-xs text-stone-500">Higher shows first when two compete for the same spot.</span>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className={captionClass}>Show only on these addresses</span>
                    <input value={ad.targetPaths} onChange={(e) => set({ targetPaths: e.target.value })} className={inputClass} placeholder="/getaways, /honeymoon" />
                  </label>
                </div>
              )}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Does this look right?</h2>
            {problems.length > 0 && (
              <ul className="mt-3 space-y-2">
                {problems.map((p) => (
                  <li key={p} className="border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">{p}</li>
                ))}
              </ul>
            )}
            <div className="mt-5 space-y-5">
              <Preview ad={ad} narrow={false} />
              <Preview ad={ad} narrow={true} />
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[var(--gold-light)] pt-5">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={secondaryClass}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className={primaryClass}>
            Next
          </button>
        ) : (
          <>
            <button type="button" disabled={saving || problems.length > 0} onClick={() => finish(true)} className={primaryClass}>
              {saving ? "Saving…" : "Publish it"}
            </button>
            <button type="button" disabled={saving} onClick={() => finish(false)} className={secondaryClass}>
              Save as a draft
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (touched && !window.confirm("Leave without saving? Your changes will be lost.")) return;
            onCancel();
          }}
          className="ml-auto text-xs font-bold uppercase tracking-[0.12em] text-stone-500 underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
