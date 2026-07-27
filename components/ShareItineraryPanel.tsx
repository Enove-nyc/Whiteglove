"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Owner-side sharing controls for the itinerary planner: create a public link,
// add people by email (they get emailed the link and see the trip in their
// account), and stop sharing.
export default function ShareItineraryPanel() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/account/itinerary/share", { cache: "no-store" });
      if (res.status === 401) { setLoggedIn(false); return; }
      if (!res.ok) { setLoggedIn(false); return; }
      setLoggedIn(true);
      const data = await res.json().catch(() => ({}));
      setUrl(data.url ?? null);
      setCollaborators(data.collaborators ?? []);
    } catch {
      // Never leave the panel invisible: if we can't tell whether the traveler
      // is signed in, show the signed-out state rather than rendering nothing.
      setLoggedIn(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function createLink() {
    setBusy(true); setError("");
    const res = await fetch("/api/account/itinerary/share", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not create the link."); return; }
    setUrl(data.url);
  }

  async function stopSharing() {
    if (!window.confirm("Stop sharing this trip? The link will stop working and everyone you added will lose access.")) return;
    setBusy(true);
    await fetch("/api/account/itinerary/share", { method: "DELETE" });
    setBusy(false);
    setUrl(null); setCollaborators([]); setNote("");
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setNote("");
    const email = emailInput.trim();
    if (!email) { setError("Enter an email address."); return; }
    setBusy(true);
    const res = await fetch("/api/account/itinerary/collaborators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not add that person."); return; }
    setCollaborators(data.collaborators ?? []);
    setUrl((u) => u ?? data.url ?? null);
    setEmailInput("");
    setNote(data.emailed ? `Added ${email} — we emailed them the link.` : `Added ${email}. (We couldn't send the email, but they'll see it in their account and you can send them the link.)`);
  }

  async function removePerson(email: string) {
    setBusy(true);
    const res = await fetch(`/api/account/itinerary/collaborators?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setCollaborators(data.collaborators ?? []);
  }

  function copyLink() {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined);
  }

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <div className="mt-5 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Share this trip</p>
        <p className="mt-2 text-sm text-stone-600"><Link href="/login" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Log in</Link> to share your itinerary with family or friends and add people to the trip.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">Share this trip</p>

      {url ? (
        <div className="mt-3">
          <p className="text-sm text-stone-600">Anyone with this link can view your itinerary (read-only):</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input readOnly value={url} className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)]" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copyLink} className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">{copied ? "Copied!" : "Copy link"}</button>
            <button type="button" onClick={stopSharing} disabled={busy} className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-300 hover:text-red-700 disabled:opacity-60">Stop sharing</button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-stone-600">Create a link to share your day-by-day plan with family or friends.</p>
          <button type="button" onClick={createLink} disabled={busy} className="mt-3 border border-[var(--navy)] bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60">{busy ? "…" : "Create share link"}</button>
        </div>
      )}

      <div className="mt-5 border-t border-[var(--gold-light)] pt-4">
        <p className="text-sm font-semibold text-[var(--navy)]">Add people to this trip</p>
        <p className="mt-1 text-xs text-stone-500">They&apos;ll get an email with the link, and the trip will appear under &ldquo;Shared with you&rdquo; when they log in.</p>
        <form onSubmit={addPerson} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)]" />
          <button type="submit" disabled={busy} className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60">{busy ? "…" : "Add person"}</button>
        </form>
        {collaborators.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {collaborators.map((email) => (
              <li key={email} className="inline-flex items-center gap-2 rounded-full border border-[var(--gold-light)] bg-white px-3 py-1 text-xs text-[var(--navy)]">
                {email}
                <button type="button" onClick={() => removePerson(email)} className="text-stone-400 hover:text-red-700" aria-label={`Remove ${email}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {note && <p className="mt-3 text-sm font-semibold text-emerald-700">{note}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
