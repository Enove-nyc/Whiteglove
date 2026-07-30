"use client";

import { FormEvent, useState } from "react";

type SuggestEditButtonProps = {
  targetType: "location" | "accommodation" | "site";
  targetId: string;
  title: string;
  currentInfo?: string;
};

const field = "mt-1 w-full rounded border border-[var(--gold-light)] bg-white px-2.5 py-1.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "block text-[11px] font-medium text-stone-500";

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
    setMessage("Thanks — sent for review.");
    setForm({ name: "", email: "", issue: "", suggestedInfo: "", source: "" });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center text-xs text-stone-400 underline decoration-[var(--gold-light)] decoration-1 underline-offset-2 transition hover:text-[var(--navy)]"
      >
        {open ? "Close" : "See something to fix? Suggest an edit"}
      </button>
      {open && (
        <form className="mt-3 grid max-w-lg gap-3 rounded border border-[var(--gold-light)] bg-[#fcfaf6] p-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Name
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required className={field} />
            </label>
            <label className={label}>Email
              <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" required className={field} />
            </label>
          </div>
          <label className={label}>What&apos;s wrong?
            <textarea value={form.issue} onChange={(event) => setForm((current) => ({ ...current, issue: event.target.value }))} required rows={2} className={field} />
          </label>
          <label className={label}>Suggested correction
            <textarea value={form.suggestedInfo} onChange={(event) => setForm((current) => ({ ...current, suggestedInfo: event.target.value }))} required rows={2} className={field} />
          </label>
          <label className={label}>Source or proof (optional)
            <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} className={field} />
          </label>
          {message && <p className="text-xs text-stone-600">{message}</p>}
          <button disabled={saving} type="submit" className="justify-self-start rounded bg-[var(--navy)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--gold)] disabled:opacity-60">{saving ? "Sending…" : "Send"}</button>
        </form>
      )}
    </div>
  );
}
