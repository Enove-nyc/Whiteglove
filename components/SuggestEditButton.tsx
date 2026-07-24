"use client";

import { FormEvent, useState } from "react";

type SuggestEditButtonProps = {
  targetType: "location" | "accommodation" | "site";
  targetId: string;
  title: string;
  currentInfo?: string;
};

export default function SuggestEditButton({ targetType, targetId, title, currentInfo = "" }: SuggestEditButtonProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", issue: "", suggestedInfo: "", source: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/content/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, title, currentInfo, ...form }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    setSaving(false);
    if (!response.ok) {
      setMessage(data?.error || "Please try again.");
      return;
    }
    setMessage("Suggestion sent to the admin review queue.");
    setForm({ name: "", email: "", issue: "", suggestedInfo: "", source: "" });
  }

  return (
    <div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <button type="button" onClick={() => setOpen((current) => !current)} className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">
        {open ? "Hide edit form" : "Suggest an edit"}
      </button>
      {open && (
        <form className="mt-4 grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Name
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Email
              <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" required className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
            </label>
          </div>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">What is wrong?
            <textarea value={form.issue} onChange={(event) => setForm((current) => ({ ...current, issue: event.target.value }))} required rows={3} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Suggested correction
            <textarea value={form.suggestedInfo} onChange={(event) => setForm((current) => ({ ...current, suggestedInfo: event.target.value }))} required rows={3} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Source or proof
            <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} className="mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-sm outline-none" />
          </label>
          {currentInfo && <p className="text-xs leading-6 text-stone-500">Current info: {currentInfo}</p>}
          {message && <p className="text-sm leading-6 text-stone-600">{message}</p>}
          <button disabled={saving} type="submit" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] disabled:opacity-60">{saving ? "Sending..." : "Send suggestion"}</button>
        </form>
      )}
    </div>
  );
}
