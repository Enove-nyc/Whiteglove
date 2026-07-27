"use client";

import { useState } from "react";

const inputClass = "mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm text-stone-700 outline-none transition focus:border-[var(--gold)]";
const caption = "text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]";

// A customer inquiry form (trip planning, honeymoon, quotes). Delivers to the
// contact inbox via /api/contact, tagged with the given subject.
export default function InquiryForm({
  subject,
  whenLabel = "Travel window",
  whenPlaceholder = "Dates, flexibility, or season",
  detailsLabel = "What do you need?",
  detailsPlaceholder,
}: {
  subject: string;
  whenLabel?: string;
  whenPlaceholder?: string;
  detailsLabel?: string;
  detailsPlaceholder?: string;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", when: "", details: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.details.trim()) {
      setError("Please add your name, email, and a few details.");
      return;
    }
    setBusy(true);
    const message = (form.when.trim() ? `${whenLabel}: ${form.when.trim()}\n\n` : "") + form.details.trim();
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, subject, message }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send your request.");
      return;
    }
    setSent(true);
    setForm({ name: "", email: "", phone: "", when: "", details: "" });
  }

  if (sent) {
    return (
      <div className="border border-[var(--gold-light)] bg-white p-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Thank you — your request is on its way.</p>
        <p className="mt-3 text-sm leading-7 text-stone-600">We&apos;ll be in touch soon. For anything urgent, email contact@whitegloveitineraries.com.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-[var(--gold-light)] bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={caption}>Name<input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>
        <label className={caption}>Email<input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label className={`${caption} sm:col-span-2`}>Phone (optional)<input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Best number to reach you" /></label>
        <label className={`${caption} sm:col-span-2`}>{whenLabel}<input className={inputClass} value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} placeholder={whenPlaceholder} /></label>
        <label className={`${caption} sm:col-span-2`}>{detailsLabel}<textarea rows={4} className={inputClass} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder={detailsPlaceholder} /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="border border-[var(--navy)] bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60">{busy ? "Sending…" : "Send request"}</button>
        {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
      </div>
    </form>
  );
}
