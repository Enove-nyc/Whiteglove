"use client";

import { useState } from "react";

// The flight page listed six things to send us and gave nobody a way to send
// them. Every one of those six is a field here, so the page asks the questions
// it says it wants answered.
//
// It posts to the same contact route the rest of the site uses. A flight
// request is an enquiry, it belongs in the same inbox as the other enquiries,
// and inventing a second delivery path for it would mean a second thing that
// can quietly stop arriving.

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  from: "",
  to: "",
  depart: "",
  ret: "",
  adults: "1",
  children: "0",
  cabin: "Economy",
  baggage: "",
  budget: "",
  notes: "",
};

export default function FlightRequestForm() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set = (patch: Partial<typeof EMPTY>) => {
    setForm((current) => ({ ...current, ...patch }));
    if (error) setError(null);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.from.trim() || !form.to.trim() || !form.depart.trim()) {
      setError("Please add your name, email, where you are flying from and to, and the date out.");
      return;
    }
    setBusy(true);
    // Written out as a message rather than sent as fields, so it arrives
    // readable in an inbox instead of as a form dump.
    const message = [
      `From: ${form.from}`,
      `To: ${form.to}`,
      `Out: ${form.depart}${form.ret ? `   Back: ${form.ret}` : "   (one way)"}`,
      `Travelling: ${form.adults} adult${form.adults === "1" ? "" : "s"}${Number(form.children) > 0 ? `, ${form.children} child${form.children === "1" ? "" : "ren"}` : ""}`,
      `Cabin: ${form.cabin}`,
      form.baggage.trim() ? `Baggage: ${form.baggage.trim()}` : "Baggage: not said",
      form.budget.trim() ? `Budget: ${form.budget.trim()}` : "Budget: not said",
      form.phone.trim() ? `Phone: ${form.phone.trim()}` : "",
      form.notes.trim() ? `\nAnything else:\n${form.notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: `Flight booking request — ${form.from} → ${form.to}`,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send it just now.");
        return;
      }
      setSent(true);
      setForm(EMPTY);
    } catch {
      setError("Could not reach us just now. Please try again, or email contact@whitegloveitineraries.com.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-8 text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">We have your flight details.</p>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          A person reads this — nothing is booked automatically, and nothing is charged until you have seen what is
          proposed and said yes. For anything urgent, email contact@whitegloveitineraries.com.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 border border-[var(--gold)] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Send us the flight</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        Fill in what you know. Nothing is booked from this form and nothing is charged — a person reads it and comes
        back to you with what is available.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block"><span className={caption}>Flying from *</span><input required className={inputClass} value={form.from} onChange={(e) => set({ from: e.target.value })} placeholder="New York, JFK" /></label>
        <label className="block"><span className={caption}>Flying to *</span><input required className={inputClass} value={form.to} onChange={(e) => set({ to: e.target.value })} placeholder="Kraków, KRK" /></label>
        <label className="block"><span className={caption}>Date out *</span><input required type="date" className={inputClass} value={form.depart} onChange={(e) => set({ depart: e.target.value })} /></label>
        <label className="block"><span className={caption}>Date back — leave empty for one way</span><input type="date" min={form.depart || undefined} className={inputClass} value={form.ret} onChange={(e) => set({ ret: e.target.value })} /></label>
        <label className="block"><span className={caption}>Adults</span><input type="number" min={1} max={20} className={inputClass} value={form.adults} onChange={(e) => set({ adults: e.target.value })} /></label>
        <label className="block"><span className={caption}>Children</span><input type="number" min={0} max={20} className={inputClass} value={form.children} onChange={(e) => set({ children: e.target.value })} /></label>
        <label className="block">
          <span className={caption}>Cabin</span>
          <select className={inputClass} value={form.cabin} onChange={(e) => set({ cabin: e.target.value })}>
            <option>Economy</option>
            <option>Premium economy</option>
            <option>Business</option>
            <option>First</option>
            <option>Whatever is cheapest</option>
          </select>
        </label>
        <label className="block"><span className={caption}>Baggage</span><input className={inputClass} value={form.baggage} onChange={(e) => set({ baggage: e.target.value })} placeholder="2 checked bags, a stroller…" /></label>
        <label className="block"><span className={caption}>Budget</span><input className={inputClass} value={form.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="Per person, or for everyone" /></label>
        <label className="block"><span className={caption}>Your name *</span><input required className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="block"><span className={caption}>Email *</span><input required type="email" className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} /></label>
        <label className="block"><span className={caption}>Phone</span><input type="tel" className={inputClass} value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
        <label className="block sm:col-span-2">
          <span className={caption}>Anything else</span>
          <textarea rows={4} className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Shabbos, a connection you want to avoid, seats together, an airline you have points with…" />
        </label>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 min-h-[48px] border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send the request"}
      </button>
    </form>
  );
}
