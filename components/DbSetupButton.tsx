"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { ok?: boolean; error?: string; tablesCreated?: boolean; counts?: Record<string, number> };

export default function DbSetupButton({
  label = "Set up database & import destinations",
  confirmMessage,
}: {
  label?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/db-setup", { method: "POST" });
      const data: Result = await response.json();
      setResult(data);
      if (data.ok) {
        // Reload so the editor picks up the freshly imported destinations.
        setTimeout(() => router.refresh(), 1200);
      }
    } catch {
      setResult({ error: "Could not reach the server. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50"
      >
        {busy ? "Setting up… (about a minute)" : label}
      </button>
      {result?.ok && (
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          Done — {result.tablesCreated ? "tables created and " : ""}imported {result.counts?.destinations ?? 0} destinations,{" "}
          {result.counts?.tzaddikim ?? 0} tzaddikim, {result.counts?.cemeteries ?? 0} cemeteries, {result.counts?.places ?? 0} places. Refreshing…
        </p>
      )}
      {result?.error && <p className="mt-4 text-sm font-semibold text-red-700">{result.error}</p>}
    </div>
  );
}
