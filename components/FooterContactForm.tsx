"use client";

import { useState } from "react";

const field = "w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-[var(--gold-light)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]/40";

export default function FooterContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Add your name, email, and a message.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send your message.");
      return;
    }
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  }

  if (sent) {
    return <p className="mt-4 text-sm leading-7 text-slate-200">Thank you — your message is on its way. We&apos;ll be in touch soon.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Your name" />
        <input type="email" className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
      </div>
      <textarea className={`${field} min-h-[90px]`} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-label="Message" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="border border-[var(--gold-light)] bg-[var(--gold)] px-6 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)] disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button>
        {error && <span className="text-xs font-semibold text-red-300">{error}</span>}
      </div>
    </form>
  );
}
