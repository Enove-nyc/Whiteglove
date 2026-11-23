"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tripAppEntryPath } from "@/lib/trip-app-entry";

export default function AppCodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, startNavigation] = useTransition();
  const [error, setError] = useState(false);

  function open(event: React.FormEvent) {
    event.preventDefault();
    const path = tripAppEntryPath(code);
    setError(!path);
    if (path) startNavigation(() => router.push(path));
  }

  return (
    <form onSubmit={open} className="flex flex-wrap items-center gap-2">
      <label htmlFor="app-code" className="sr-only">
        Trip code or link
      </label>
      <input
        id="app-code"
        value={code}
        onChange={(e) => { setCode(e.target.value); setError(false); }}
        aria-invalid={error || undefined}
        aria-describedby={error ? "app-code-error" : undefined}
        maxLength={512}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Paste your code or link"
        className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm font-semibold tracking-[0.14em] text-[var(--navy)] outline-none focus:border-[var(--gold)]"
      />
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-50"
      >
        {busy ? "Opening…" : "Open my trip"}
      </button>
      {error && <p id="app-code-error" role="alert" className="w-full text-sm text-red-800">Enter a trip code or a White Glove Itineraries trip link.</p>}
    </form>
  );
}

