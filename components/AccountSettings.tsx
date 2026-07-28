"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function AccountSettings({
  initial,
}: {
  initial: { name?: string; email: string; phone?: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name ?? "");
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/account/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage({ ok: false, text: data?.error || "Could not save your changes." });
      return;
    }
    setMessage({ ok: true, text: "Your details were saved." });
    router.refresh();
  }

  async function removeAccount() {
    if (!window.confirm("Delete your account permanently? Your saved route and favorites will be erased. This can't be undone.")) return;
    setDeleting(true);
    setMessage(null);
    const response = await fetch("/api/account/delete", { method: "POST" });
    if (response.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setDeleting(false);
    setMessage({ ok: false, text: "Could not delete the account. Please try again." });
  }

  return (
    <div className="wg-card mt-10 border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Account settings</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Your details</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-md border border-[var(--gold)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
        >
          {open ? "Close" : "Edit details"}
        </button>
      </div>

      {!open ? (
        <p className="mt-4 text-sm leading-6 text-stone-600">Update your name, phone, and email, or delete your account.</p>
      ) : (
      <>
      <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={captionClass}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Your name" className={inputClass} />
        </label>
        <label className="block">
          <span className={captionClass}>Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+1 ..." className={inputClass} />
        </label>
        <label className="block sm:col-span-2">
          <span className={captionClass}>Email address</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className={inputClass} />
          <span className="mt-1 block text-xs text-stone-400">Changing this updates the address you sign in with.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {message && (
            <span className={`text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</span>
          )}
        </div>
      </form>

      <div className="mt-8 border-t border-[var(--gold-light)] pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Delete account</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
          Permanently remove your account and everything saved to it. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={removeAccount}
          disabled={deleting}
          className="mt-4 rounded-md border border-red-300 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-700 hover:text-white disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
