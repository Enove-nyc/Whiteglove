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
 */
export default function OpenAdminButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error || "Could not open the admin area.");
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
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
      >
        {busy ? "Opening…" : "Open the admin area →"}
      </button>
      {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
    </span>
  );
}
