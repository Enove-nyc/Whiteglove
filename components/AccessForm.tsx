"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccessForm({ scope, next }: { scope: "admin" | "site"; next?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    const response = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, password }) });
    if (!response.ok) { const data = await response.json().catch(() => null); setMessage(data?.error || "Please try again."); setSaving(false); return; }
    // A short code has to say so. Letting it lapse silently halfway through
    // what somebody came to read is the one thing worse than not letting them in.
    const data = await response.json().catch(() => null);
    if (data?.expiresInMinutes) {
      setMinutes(data.expiresInMinutes);
      setTimeout(() => {
        router.replace(scope === "admin" ? "/admin" : (next?.startsWith("/") ? next : "/"));
        router.refresh();
      }, 1800);
      return;
    }
    router.replace(scope === "admin" ? "/admin" : (next?.startsWith("/") ? next : "/"));
    router.refresh();
  }
  if (minutes) {
    return (
      <p className="mt-7 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-[var(--navy)]">
        That is a short-stay code — you have <strong>{minutes} minutes</strong>. Taking you in now.
      </p>
    );
  }

  return <form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-semibold text-[var(--navy)]">Password<input autoFocus value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-[var(--gold-light)] bg-white px-4 py-3 outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[rgba(170,139,82,.12)]" /></label>{message && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}<button disabled={saving} className="w-full rounded-full bg-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-60">{saving ? "Checking..." : scope === "admin" ? "Open admin" : "Enter White Glove"}</button></form>;
}
