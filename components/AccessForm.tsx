"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin-nav";
import { safeAdminNext } from "@/lib/admin-host";

export default function AccessForm({ scope, next }: { scope: "admin" | "site"; next?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  /**
   * The second factor, asked for only once the server says this door has one.
   *
   * Never shown up front. A code field on a door with no code configured tells
   * anybody who loads the page that there is no second factor here; asking
   * only after the password was right says nothing to somebody who guessed
   * wrong.
   */
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");

  function destination() {
    if (scope !== "admin") return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
    const canonical = safeAdminNext(next);
    return adminHref(canonical, pathname);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, password: password.trim(), ...(code.trim() ? { code: code.trim() } : {}) }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string; needsCode?: boolean } | null;
      if (data?.needsCode) {
        setNeedsCode(true);
        // The first ask is not a failure and should not read as one — the
        // password was right, there is simply a second step.
        setMessage(data.error || "");
      } else {
        setMessage(data?.error || "Please try again.");
      }
      setSaving(false);
      return;
    }
    // A short code has to say so. Letting it lapse silently halfway through
    // what somebody came to read is the one thing worse than not letting them in.
    const data = await response.json().catch(() => null);
    const dest = destination();
    if (data?.expiresInMinutes) {
      setMinutes(data.expiresInMinutes);
      setTimeout(() => {
        router.replace(dest);
        router.refresh();
      }, 1800);
      return;
    }
    router.replace(dest);
    router.refresh();
  }
  if (minutes) {
    return (
      <p className="mt-7 border-l-4 border-[var(--gold)] bg-[var(--cream)] px-4 py-3 text-sm leading-6 text-[var(--navy)]">
        That is a short-stay code — you have <strong>{minutes} minutes</strong>. Taking you in now.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold text-[var(--navy)]">
        Password
        <input
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 outline-none focus:border-[var(--gold)]"
        />
      </label>
      {needsCode && (
        <label className="block text-sm font-semibold text-[var(--navy)]">
          Code from your authenticator app
          <input
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 tracking-[0.3em] outline-none focus:border-[var(--gold)]"
          />
          <span className="mt-2 block text-xs font-normal leading-5 text-stone-600">
            Or one of your recovery codes, if you do not have your phone.
          </span>
        </label>
      )}
      {message && <p className="text-sm text-red-700">{message}</p>}
      <button
        disabled={saving}
        className="w-full bg-[var(--navy)] px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-60"
      >
        {saving ? "Checking..." : needsCode ? "Confirm" : scope === "admin" ? "Open admin" : "Enter White Glove"}
      </button>
    </form>
  );
}
