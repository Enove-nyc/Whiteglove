"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { AccountInvitation } from "@/lib/account-invitations";

export default function AccountInvitationsPanel() {
  const [identity, setIdentity] = useState("");
  const [brand, setBrand] = useState("kosher");
  const [now, setNow] = useState(0);
  const [invitations, setInvitations] = useState<AccountInvitation[]>([]);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/account-invitations", { cache: "no-store" });
      const data = await response.json() as { invitations?: AccountInvitation[]; error?: string };
      if (!response.ok || !data.invitations) throw new Error(data.error || "Invitations could not be loaded.");
      setInvitations(data.invitations); setNow(Date.now());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitations could not be loaded."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setLink("");
    try {
      const response = await fetch("/api/admin/account-invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", identity, brand }) });
      const data = await response.json() as { link?: string; error?: string };
      if (!response.ok || !data.link) throw new Error(data.error || "The invitation could not be created.");
      setLink(data.link); setMessage("Invitation ready. Copy the link and send it to this person.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The invitation could not be created."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/account-invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", id }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "The invitation could not be revoked.");
      setMessage("Invitation revoked."); setLink(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The invitation could not be revoked."); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setMessage("Invitation link copied."); }
    catch { setMessage("Select and copy the invitation link below."); }
  }

  const field = "mt-2 block min-h-11 w-full rounded-lg border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)]";
  return <section aria-labelledby="account-invitations-heading" className="mb-8 rounded-xl border border-[var(--gold-light)] bg-white p-5 sm:p-7">
    <h2 id="account-invitations-heading" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Account invitations</h2>
    <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-700">New accounts require a link from you. Each link works once, for the named person, and expires after seven days. No invitation email is sent automatically. Login details and trips remain shared across both websites.</p>
    <form onSubmit={create} className="mt-5 grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
      <label className="text-sm font-semibold text-[var(--navy)]">Email or phone number<input required value={identity} onChange={event => setIdentity(event.target.value)} className={field} autoComplete="off" /></label>
      <label className="text-sm font-semibold text-[var(--navy)]">Invitation website<select value={brand} onChange={event => setBrand(event.target.value)} className={field}><option value="kosher">White Glove Kosher Travel</option><option value="itineraries">White Glove Itineraries</option></select></label>
      <button disabled={busy} type="submit" className="min-h-11 rounded-lg bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">Generate invitation link</button>
    </form>
    {message && <p role="status" className="mt-4 text-sm leading-6 text-stone-700">{message}</p>}
    {link && <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm font-semibold text-[var(--navy)]">Invitation link<input readOnly value={link} onFocus={event => event.target.select()} className={field} /></label>
      <button type="button" onClick={() => void copy()} className="min-h-11 rounded-lg border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)]">Copy invitation link</button>
    </div>}
    {invitations.length > 0 && <ul className="mt-6 divide-y divide-stone-200">
      {invitations.map(invitation => {
        const expired = new Date(invitation.expiresAt).getTime() <= now;
        return <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="break-all text-sm font-semibold text-[var(--navy)]">{invitation.identity}</p><p className="mt-1 text-xs text-stone-600">{expired ? "Expired" : invitation.status === "pending" ? "Ready to use" : invitation.status === "used" ? "Used" : "Revoked"} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>
          {invitation.status === "pending" && !expired && <button type="button" disabled={busy} onClick={() => void revoke(invitation.id)} className="min-h-11 rounded-lg border border-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--navy)] disabled:opacity-60">Revoke<span className="sr-only"> invitation for {invitation.identity}</span></button>}
        </li>;
      })}
    </ul>}
  </section>;
}
