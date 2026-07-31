"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { ok?: boolean; error?: string; tablesCreated?: boolean; upgradedOnly?: boolean; counts?: Record<string, number> };

/**
 * Two actions that were one button.
 *
 * `reimport` REPLACES every built-in record from data/*.ts. Bringing the
 * database up to date does not, and is what most changes need. Pressing one and
 * getting both is how an import run to fix the schema deleted the owner's own
 * additions, so the destructive half now has to be asked for by name.
 */
export default function DbSetupButton({
  label = "Bring the database up to date",
  confirmMessage,
  reimport = false,
}: {
  label?: string;
  confirmMessage?: string;
  reimport?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/db-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimport }),
      });
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
        {busy ? (reimport ? "Importing… (about a minute)" : "Updating…") : label}
      </button>
      {result?.ok && result.upgradedOnly && (
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          Done — the database is up to date. Nothing you entered was touched.
        </p>
      )}
      {result?.ok && !result.upgradedOnly && (
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          Done — {result.tablesCreated ? "tables created and " : ""}imported {result.counts?.destinations ?? 0} destinations,{" "}
          {result.counts?.tzaddikim ?? 0} tzaddikim, {result.counts?.cemeteries ?? 0} cemeteries, {result.counts?.places ?? 0} places, {result.counts?.directory ?? 0} directory listings,{" "}
          {result.counts?.attractions ?? 0} attractions, {result.counts?.stays ?? 0} places to stay and {result.counts?.areas ?? 0} Jewish quarters. Refreshing…
        </p>
      )}
      {result?.error && <p className="mt-4 text-sm font-semibold text-red-700">{result.error}</p>}
    </div>
  );
}
