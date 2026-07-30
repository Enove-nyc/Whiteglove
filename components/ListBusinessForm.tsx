"use client";

import { useState } from "react";

const CATEGORIES: Array<[string, string]> = [
  ["Tour operator / organizer", "Tour operator / organizer"],
  ["Vacation planner / concierge", "Vacation planner / concierge"],
  ["Travel agency", "Travel agency"],
  ["Tour guide / private driver", "Tour guide / private driver"],
];

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function ListBusinessForm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const business = String(data.get("business") || "").trim();
    const contact = String(data.get("contact") || "").trim();
    const email = String(data.get("email") || "").trim();
    const category = String(data.get("category") || "").trim();
    const details = String(data.get("details") || "").trim();
    const website = String(data.get("website") || "").trim();
    if (!business || !contact || !email || !details) {
      setError("Please fill in the business name, your name, email, and details.");
      setBusy(false);
      return;
    }
    const suggestedInfo = [
      `Category: ${category || "(not specified)"}`,
      `Phone/WhatsApp/Website: ${website || "(see details)"}`,
      "",
      details,
    ].join("\n");
    try {
      const response = await fetch("/api/content/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "directory",
          targetId: "directory",
          title: business,
          name: contact,
          email,
          issue: "New directory listing request",
          suggestedInfo,
          source: website,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result?.error || "Could not submit right now. Please try again.");
      } else {
        setDone(true);
        form.reset();
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Thank you — your listing was submitted.</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">White Glove will review it and add it to the directory once approved.</p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Are you a provider?</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">List your business</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-h-11 border border-[var(--navy)] bg-[var(--navy)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]"
        >
          {open ? "Close" : "Submit your listing"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={captionClass}>Business name *</span>
            <input name="business" className={inputClass} required />
          </label>
          <label className="block">
            <span className={captionClass}>Category</span>
            <select name="category" className={inputClass} defaultValue="">
              <option value="" disabled>Choose one…</option>
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={captionClass}>Your name *</span>
            <input name="contact" className={inputClass} required />
          </label>
          <label className="block">
            <span className={captionClass}>Your email *</span>
            <input name="email" type="email" className={inputClass} required />
          </label>
          <label className="block sm:col-span-2">
            <span className={captionClass}>Phone / WhatsApp / Website</span>
            <input name="website" className={inputClass} placeholder="How travelers should reach you" />
          </label>
          <label className="block sm:col-span-2">
            <span className={captionClass}>What you offer *</span>
            <textarea name="details" rows={4} className={inputClass} placeholder="Regions you serve, languages, specialties, and anything else." required />
          </label>
          <div className="sm:col-span-2 flex items-center gap-4">
            <button type="submit" disabled={busy} className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60">
              {busy ? "Submitting…" : "Submit for review"}
            </button>
            {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
          </div>
          <p className="sm:col-span-2 text-[11px] leading-4 text-stone-400">Submissions are reviewed by White Glove before appearing in the directory.</p>
        </form>
      )}
    </div>
  );
}
