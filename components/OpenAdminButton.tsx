"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Open the admin as yourself.
 *
 * This was a plain link to /admin, and for anybody but the owner it was a dead
 * end: the middleware wants the admin cookie, the only thing that minted one
 * was the shared password, and a helper granted admin on the team screen had
 * never been given that password. They were sent to a prompt they could not
 * answer, from a button that said they could get in.
 *
 * It asks the server for the session first, then goes.
 *
 * And where this administrator has a second factor, the server answers
 * `needsCode` rather than an error — the account is right, there is simply
 * one more step — so this turns into a code field instead of reading as a
 * refusal.
 */
export default function OpenAdminButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(code.trim() ? { code: code.trim() } : {}),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; needsCode?: boolean } | null;
      if (!response.ok) {
        if (data?.needsCode) {
          setNeedsCode(true);
          setError(data.error || "");
        } else {
          setError(data?.error || "Could not open the admin area.");
        }
        return;
      }
      router.push("/admin");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      {needsCode && (
        <input
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void open();
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          aria-label="Code from your authenticator app"
          className="w-32 border border-[var(--gold-light)] bg-white px-3 py-3 tracking-[0.3em] outline-none focus:border-[var(--gold)]"
        />
      )}
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
      >
        {busy ? "Opening…" : needsCode ? "Confirm" : "Open the admin area →"}
      </button>
      {needsCode && !error && (
        <span className="text-sm text-stone-600">Enter the code from your app, or a recovery code.</span>
      )}
      {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
    </span>
  );
}
