"use client";

import { useEffect, useState } from "react";

/**
 * Share the app with a client — Business-only, on the account page's app card.
 *
 * It rides the SAME share token the printed itinerary uses
 * (/api/account/itinerary/share); the only new thing is the address it hands
 * over — the trip opened as the app (/i/<id>/app) rather than the document
 * (/i/<id>). A client opens it on their phone with no account and no plan.
 *
 * WHY IT LIVES BEHIND THE BUSINESS CARD. Turning a trip into an app the client
 * can open is the Business capability; the route itself refuses any trip whose
 * owner is not on Business. So this control is only ever drawn for a Business
 * account (app/account/page.tsx gates it), and it never has to check a plan.
 */
export default function CompanionShare() {
  const [ready, setReady] = useState(false);
  const [appUrl, setAppUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/account/itinerary/share", { cache: "no-store" });
      if (!res.ok) {
        setReady(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setAppUrl(data.url ? `${data.url}/app` : null);
    } catch {
      /* leave the create state showing */
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function createLink() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/itinerary/share", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || "Could not create the link.");
        return;
      }
      setAppUrl(`${data.url}/app`);
    } finally {
      setBusy(false);
    }
  }

  async function stopSharing() {
    if (!window.confirm("Stop sharing this trip? The client's link will stop working.")) return;
    setBusy(true);
    try {
      await fetch("/api/account/itinerary/share", { method: "DELETE" });
      setAppUrl(null);
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!appUrl) return;
    navigator.clipboard
      ?.writeText(appUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  }

  if (!ready) return null;

  return (
    <div className="mt-4 border-t border-[var(--gold-light)] pt-4">
      <p className="text-sm font-semibold text-[var(--navy)]">Send it to your client</p>
      {appUrl ? (
        <>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            This link opens your open trip as the app on their phone — no account needed. Update the
            trip in the planner and their link shows the change.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={appUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)]"
            />
            <button
              type="button"
              onClick={copyLink}
              className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={stopSharing}
              disabled={busy}
              className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-300 hover:text-red-700 disabled:opacity-60"
            >
              Stop sharing
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Create a link that opens your open trip as the app on your client&apos;s phone. They need
            no account.
          </p>
          <button
            type="button"
            onClick={createLink}
            disabled={busy}
            className="mt-2 rounded-full bg-[var(--navy)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "…" : "Create a client link"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
