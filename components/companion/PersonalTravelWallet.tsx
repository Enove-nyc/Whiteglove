"use client";

import { useEffect, useId, useState } from "react";
import TravelDocumentPreview, { preparePdfViewer } from "@/components/companion/TravelDocumentPreview";
import { listPersonalDocuments, personalWalletScope, removePersonalDocument, savePersonalDocument, type PersonalTravelDocument } from "@/lib/personal-travel-wallet";

type AccountWallet = { available?: boolean; signedIn?: boolean; files?: Array<{ id: string; name: string; kind: string; type: string; savedAt: string }> };
async function uploadToAccount(document: PersonalTravelDocument): Promise<void> {
  const response = await fetch("/api/account/wallet", { method: "POST", body: document.blob, headers: {
    "Content-Type": document.blob.type || "application/octet-stream", "x-wallet-scope": document.scope, "x-wallet-id": document.id,
    "x-wallet-name": encodeURIComponent(document.name), "x-wallet-kind": encodeURIComponent(document.kind), "x-wallet-saved-at": document.savedAt,
  } });
  if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error || "The file was not saved to your account.");
}
/**
 * Bring this device and the account into line: files on the account but not
 * here are downloaded (so they open offline); files saved here before signing
 * in go up once; a file that was on the account and has gone was removed on
 * another device, so it goes here too.
 */
async function syncWithAccount(scope: string, local: PersonalTravelDocument[], files: NonNullable<AccountWallet["files"]>): Promise<PersonalTravelDocument[]> {
  const onAccount = new Set(files.map((file) => file.id));
  const rows: PersonalTravelDocument[] = [];
  for (const document of local) {
    if (document.synced && !onAccount.has(document.id)) { await removePersonalDocument(document.id).catch(() => {}); continue; }
    if (!document.synced) {
      try { await uploadToAccount(document); document.synced = true; await savePersonalDocument(document); } catch { /* stays on this device */ }
    }
    rows.push(document);
  }
  const here = new Set(local.map((document) => document.id));
  for (const file of files) {
    if (here.has(file.id)) continue;
    try {
      const response = await fetch(`/api/account/wallet?scope=${scope}&id=${file.id}`, { cache: "no-store" });
      if (!response.ok) continue;
      const blob = new Blob([await response.arrayBuffer()], { type: file.type });
      const document: PersonalTravelDocument = { id: file.id, scope, name: file.name, kind: file.kind, savedAt: file.savedAt, blob, synced: true };
      await savePersonalDocument(document);
      rows.push(document);
    } catch { /* try again next time the wallet opens */ }
  }
  return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Private files: on this device, and on the traveller's own account when they
 *  are logged in. They never become attachments on the shared trip. */
export default function PersonalTravelWallet({ tripKey }: { tripKey: string }) {
  const inputId = useId();
  const [scope, setScope] = useState("");
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState<PersonalTravelDocument[]>([]);
  const [kind, setKind] = useState("Boarding pass");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<PersonalTravelDocument | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  // "device" until the account answers; "account" when signed in and the
  // account copy works; "signed-out" when logging in would add it.
  const [mode, setMode] = useState<"device" | "account" | "signed-out">("device");
  const sample = tripKey.startsWith("sample:");
  useEffect(() => {
    let active = true;
    void personalWalletScope(tripKey).then(async (key) => ({ key, rows: await listPersonalDocuments(key) })).then(async ({ key, rows }) => {
      if (!active) return;
      setScope(key); setDocuments(rows); setReady(true);
      if (sample) return;
      try {
        const response = await fetch(`/api/account/wallet?scope=${key}`, { cache: "no-store" });
        const account = await response.json() as AccountWallet;
        if (!active || !response.ok || !account.available) return;
        if (!account.signedIn) { setMode("signed-out"); return; }
        setMode("account");
        const synced = await syncWithAccount(key, rows, account.files ?? []);
        if (active) setDocuments(synced);
      } catch { /* the device copy still works */ }
    }).catch(() => { if (active) { setReady(true); setError("This device’s wallet could not be opened. Try again with device storage enabled."); } });
    return () => { active = false; };
  }, [tripKey, sample]);

  async function add(file: File) {
    setBusy(true); setError(""); setNotice("");
    try {
      const document: PersonalTravelDocument = { id: crypto.randomUUID(), scope, name: file.name, kind, savedAt: new Date().toISOString(), blob: file };
      await savePersonalDocument(document);
      setDocuments((rows) => [document, ...rows]);
      if (mode === "account") {
        try { await uploadToAccount(document); document.synced = true; await savePersonalDocument(document); }
        catch (problem) { setNotice(`Saved on this device. ${problem instanceof Error ? problem.message : "It was not saved to your account."}`); return; }
      }
      if (file.type === "application/pdf") {
        try { await preparePdfViewer(); }
        catch { setNotice("Saved on this device. Open it once with a connection to prepare the PDF viewer for offline use."); return; }
      }
      setNotice(mode === "account" ? "Saved on this device and to your account. You can open it without a connection." : "Saved on this device. You can open it without a connection.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "The file was not saved."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError("");
    try {
      if (mode === "account") {
        const response = await fetch(`/api/account/wallet?scope=${scope}&id=${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("account");
      }
      await removePersonalDocument(id); setDocuments((rows) => rows.filter((row) => row.id !== id)); setRemoveId(null); }
    catch { setError("The file could not be removed. Please try again."); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby={`${inputId}-heading`} className="rounded-2xl border border-stone-200 bg-white p-4 text-[#15204A]">
    <h2 id={`${inputId}-heading`} className="text-lg font-semibold">Your personal wallet</h2>
    <p className="mt-2 text-sm leading-6 text-stone-600">{mode === "account"
      ? "Boarding passes, hotel confirmations and entry tickets. Files are kept on this device, so they open offline, and on your account, so they appear on any phone where you log in. They are private to you and not shared with the trip group."
      : "Boarding passes, hotel confirmations and entry tickets. Files stay on this device, work offline and are private to you. They are not shared with the trip group. Signing out or clearing app data removes them from this device."}</p>
    {mode === "signed-out" ? <p className="mt-2 text-sm leading-6 text-stone-600"><a href={`/login?next=${encodeURIComponent(typeof window === "undefined" ? "/app" : window.location.pathname)}`} className="font-semibold underline underline-offset-4">Log in</a> to keep them on your account as well, so they reach your other phone.</p> : null}
    <label htmlFor={`${inputId}-kind`} className="mt-4 block text-sm font-semibold">Document type</label>
    <select id={`${inputId}-kind`} value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3">
      {["Boarding pass", "Hotel confirmation", "Entry ticket", "Other travel document"].map((label) => <option key={label}>{label}</option>)}
    </select>
    <label htmlFor={inputId} className="mt-3 block text-sm font-semibold">Add a PDF or photo · up to 15 MB</label>
    <input id={inputId} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy || !scope} className="mt-2 min-h-11 w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-[#15204A] file:px-4 file:text-white" onChange={(event) => {
      const file = event.target.files?.[0]; event.target.value = ""; if (file) void add(file);
    }} />
    <p role="status" className="mt-2 text-sm leading-6">{busy ? "Saving changes…" : notice}</p>
    {error ? <p role="alert" className="mt-2 text-sm text-red-800">{error}</p> : null}
    {documents.length ? <ul className="mt-3 divide-y divide-stone-200">{documents.map((document) => <li key={document.id} className="py-3">
      <p className="text-xs font-semibold text-stone-600">{document.kind}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 break-all"><button type="button" onClick={() => setPreview(document)} className="inline-flex min-h-11 items-center text-left font-semibold underline underline-offset-4">{document.name}</button><button type="button" disabled={busy} onClick={() => setRemoveId(document.id)} className="min-h-11 px-2 text-sm underline">Remove</button></div>
      {removeId === document.id ? <div className="mt-2 rounded-xl bg-stone-50 p-3 text-sm"><p>Remove this file from your wallet?</p><div className="mt-1 flex gap-4"><button type="button" disabled={busy} onClick={() => void remove(document.id)} className="min-h-11 font-semibold text-red-800">Remove file</button><button type="button" onClick={() => setRemoveId(null)} className="min-h-11">Keep it</button></div></div> : null}
    </li>)}</ul> : ready ? <p className="mt-2 text-sm text-stone-600">{error ? "" : "No personal documents saved for this trip yet."}</p> : <p role="status" className="mt-2 text-sm text-stone-600">Opening your wallet…</p>}
    {preview ? <TravelDocumentPreview key={preview.id} document={preview} onClose={() => setPreview(null)} /> : null}
  </section>;
}
