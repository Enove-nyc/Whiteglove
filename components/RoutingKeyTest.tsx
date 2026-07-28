"use client";

import { useEffect, useState } from "react";

type Result = {
  keySet?: boolean;
  ok?: boolean;
  engine?: string;
  route?: string;
  minutes?: number;
  readable?: string;
  km?: number | null;
  status?: number;
  error?: string;
  advice?: string;
};

const code = "rounded bg-[var(--cream)] px-1 font-mono text-[12px]";

export default function RoutingKeyTest() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/routing-test", { cache: "no-store" });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, error: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Driving times</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Is the Google Maps key working?</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
        This drives a real route — Kraków to Leżajsk — through the Google Routes API and shows what comes back.
        A key that is set but not working looks exactly the same in the planner as no key at all: the times quietly
        fall back to an estimate. This is how you tell the difference.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60"
        >
          {busy ? "Checking…" : "Check again"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-5 border-l-4 px-4 py-3 text-sm leading-6 ${
            result.ok ? "border-emerald-400 bg-emerald-50 text-emerald-900" : "border-amber-400 bg-amber-50 text-amber-900"
          }`}
        >
          {result.ok ? (
            <>
              <strong>Working.</strong> {result.route} came back as <strong>{result.readable}</strong>
              {result.km ? ` over ${result.km} km` : ""}, for typical traffic.
              <p className="mt-2">Driving times in the planner are now the same numbers Google Maps would give.</p>
            </>
          ) : (
            <>
              <strong>{result.keySet === false ? "No key set." : "Not working yet."}</strong>
              {result.status ? ` Google returned HTTP ${result.status}.` : ""}
              {result.advice ? <p className="mt-2">{result.advice}</p> : null}
              {result.error ? (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">{result.error}</pre>
              ) : null}
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-stone-500">
        The variable is <code className={code}>GOOGLE_MAPS_API_KEY</code>, set in Vercel under Settings → Environment
        Variables. Environment variables are read when the site builds, so a new key does nothing until you redeploy.
      </p>
    </section>
  );
}
