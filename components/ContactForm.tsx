"use client";

import { useState } from "react";

const inputClass = "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please add your name, email, and a message.");
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
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  }

  if (sent) {
    return (
      <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Thank you — your message is on its way.</p>
        <p className="mt-3 text-sm leading-7 text-stone-600">We&apos;ll be in touch soon. For anything urgent, email us directly at contacts@whitegloveitineraries.com.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 border border-[var(--gold)] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={caption}>Your name *</span><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block"><span className={caption}>Email *</span><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block"><span className={caption}>Phone (optional)</span><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label className="block"><span className={caption}>Subject (optional)</span><input className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Trip to Uman" /></label>
        <label className="block sm:col-span-2"><span className={caption}>Message *</span><textarea className={`${inputClass} min-h-[140px]`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help — dates, destinations, and what matters most." /></label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="border border-[var(--navy)] bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60">{busy ? "Sending…" : "Send message"}</button>
        {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
      </div>
    </form>
  );
}
