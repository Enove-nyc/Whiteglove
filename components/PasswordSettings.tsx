"use client";

import { FormEvent, useState } from "react";

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

function ChangeForm({
  scope,
  title,
  hint,
  requireCurrent,
}: {
  scope: "admin" | "site";
  title: string;
  hint: string;
  requireCurrent: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setMessage({ ok: false, text: data?.error || "Could not update the password." });
      return;
    }
    setMessage({ ok: true, text: "Password updated." });
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <form onSubmit={submit} className="border border-[var(--gold-light)] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{hint}</p>
      <div className="mt-4 space-y-3">
        {requireCurrent && (
          <label className="block">
            <span className={captionClass}>Current admin password</span>
            <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" required className={inputClass} />
          </label>
        )}
        <label className="block">
          <span className={captionClass}>New password</span>
          <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required minLength={scope === "site" ? 4 : 6} placeholder={`At least ${scope === "site" ? 4 : 6} characters`} className={inputClass} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Update password"}
        </button>
        {message && (
          <span className={`text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</span>
        )}
      </div>
    </form>
  );
}

export default function PasswordSettings({ available }: { available: boolean }) {
  return (
    <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Passwords</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Change your passwords</h2>
      {!available ? (
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Connect the private database (Upstash Redis) to change passwords from here. Until then they come from the site&apos;s environment settings.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ChangeForm
            scope="admin"
            title="Admin dashboard password"
            hint="The password you use to open this owner dashboard."
            requireCurrent
          />
          <ChangeForm
            scope="site"
            title="Website access password"
            hint="The password visitors enter when the site is locked."
            requireCurrent={false}
          />
        </div>
      )}
    </section>
  );
}
