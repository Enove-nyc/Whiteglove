"use client";

import { useEffect, useState } from "react";
import type { StoredProvider } from "@/lib/directory-store";

const inputClass = "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";

const CATEGORIES: Array<[StoredProvider["category"], string]> = [
  ["TOUR_OPERATOR", "Tour operator / organizer"],
  ["VACATION_PLANNER", "Vacation planner / concierge"],
  ["TRAVEL_AGENCY", "Travel agency"],
  ["GUIDE_DRIVER", "Tour guide / private driver"],
];
const CAT_LABEL = Object.fromEntries(CATEGORIES) as Record<string, string>;

const EMPTY = {
  id: "", name: "", category: "TOUR_OPERATOR" as StoredProvider["category"], services: "", tagline: "",
  phone: "", whatsapp: "", email: "", website: "", basedIn: "", regions: "", languages: "", specialties: "",
  description: "", notes: "", featured: false, published: true,
  contactConsent: false, contactConsentNote: "", verifiedAt: "", responseTime: "",
};

export default function AdminDirectoryManager() {
  const [providers, setProviders] = useState<StoredProvider[]>([]);
  const [available, setAvailable] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/directory", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data) { setProviders(data.providers ?? []); setAvailable(data.available !== false); }
  }
  useEffect(() => { load(); }, []);

  function edit(p: StoredProvider) {
    setForm({ ...EMPTY, ...p, services: p.services ?? "", tagline: p.tagline ?? "", phone: p.phone ?? "", whatsapp: p.whatsapp ?? "", email: p.email ?? "", website: p.website ?? "", basedIn: p.basedIn ?? "", regions: p.regions ?? "", languages: p.languages ?? "", specialties: p.specialties ?? "", description: p.description ?? "", notes: p.notes ?? "", featured: Boolean(p.featured), published: p.published !== false, contactConsent: Boolean(p.contactConsent), contactConsentNote: p.contactConsentNote ?? "", verifiedAt: p.verifiedAt ?? "", responseTime: p.responseTime ?? "" });
    setMsg(null); setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    if (!form.name.trim()) { setError("Add a business name."); return; }
    setBusy(true);
    const res = await fetch("/api/admin/directory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Could not save."); return; }
    setMsg(form.id ? "Saved." : "Provider added to the directory.");
    setForm({ ...EMPTY });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/directory?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (form.id === id) setForm({ ...EMPTY });
    load();
  }

  if (!available) {
    return <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 text-sm text-stone-600">The private store isn&apos;t connected, so directory listings can&apos;t be saved yet.</div>;
  }

  return (
    <div>
      <form onSubmit={save} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{form.id ? "Edit provider" : "Add a provider"}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className={caption}>Business / person name *</span><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Reb Yossi's Uman Tours" /></label>
          <label className="block"><span className={caption}>Category</span><select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as StoredProvider["category"] })}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="block"><span className={caption}>Based in (city, country)</span><input className={inputClass} value={form.basedIn} onChange={(e) => setForm({ ...form, basedIn: e.target.value })} placeholder="Uman, Ukraine" /></label>
          <label className="block sm:col-span-2"><span className={caption}>Services offered</span><input className={inputClass} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Airport pickup, kever transport, hotel booking, guided tours…" /></label>
          <label className="block"><span className={caption}>Phone</span><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+380 …" /></label>
          <label className="block"><span className={caption}>WhatsApp</span><input className={inputClass} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+380 …" /></label>
          <label className="block"><span className={caption}>Email</span><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></label>
          <label className="block"><span className={caption}>Website</span><input className={inputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></label>
          <label className="block"><span className={caption}>Regions served (comma-separated)</span><input className={inputClass} value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} placeholder="Ukraine, Poland, Worldwide" /></label>
          <label className="block"><span className={caption}>Languages (comma-separated)</span><input className={inputClass} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="English, Hebrew, Yiddish" /></label>
          <label className="block sm:col-span-2"><span className={caption}>Specialties (comma-separated)</span><input className={inputClass} value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Uman, kevarim tours, honeymoons" /></label>
          <label className="block sm:col-span-2"><span className={caption}>Tagline</span><input className={inputClass} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="One short line about them" /></label>
          <label className="block sm:col-span-2"><span className={caption}>Description</span><textarea rows={3} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="block sm:col-span-2"><span className={caption}>Private notes (not shown to visitors)</span><input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <label className="block"><span className={caption}>How quickly they answer (their words)</span><input className={inputClass} value={form.responseTime} onChange={(e) => setForm({ ...form, responseTime: e.target.value })} placeholder="same day / within a week" /></label>
          <label className="block"><span className={caption}>Date you last checked this listing</span><input type="date" className={inputClass} value={form.verifiedAt} onChange={(e) => setForm({ ...form, verifiedAt: e.target.value })} /></label>

          {/* Permission to publish their number. Off unless somebody asked. */}
          <div className="sm:col-span-2 border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="h-4 w-4" checked={form.contactConsent} onChange={(e) => setForm({ ...form, contactConsent: e.target.checked })} />
              <span className="text-sm font-semibold text-[var(--navy)]">They agreed their phone number may be published</span>
            </label>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Off unless somebody asked them. Many of these are one person with a mobile, and having been given a
              number is not the same as agreeing it goes on a public page. Left off, the number is kept here and the
              directory says a number is held but not publishable.
            </p>
            <label className="mt-3 block"><span className={caption}>How they gave it</span><input className={inputClass} value={form.contactConsentNote} onChange={(e) => setForm({ ...form, contactConsentNote: e.target.value })} placeholder="asked by phone, 4 March" /></label>
            {form.contactConsent && !form.contactConsentNote.trim() && (
              <p className="mt-2 text-xs font-semibold text-amber-800">Worth writing down how it was given, so the answer to &ldquo;who said we could&rdquo; is not somebody&apos;s memory.</p>
            )}
          </div>

          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /><span className="text-sm text-[var(--navy)]">Featured (shown first)</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /><span className="text-sm text-[var(--navy)]">Published (visible on /directory)</span></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60">{busy ? "Saving…" : form.id ? "Save changes" : "Add provider"}</button>
          {form.id && <button type="button" onClick={() => setForm({ ...EMPTY })} className="border border-[var(--gold-light)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Cancel edit</button>}
          {msg && <span className="text-sm font-semibold text-emerald-700">{msg}</span>}
          {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
        </div>
      </form>

      <div className="mt-6 overflow-x-auto border border-[var(--gold-light)] bg-[#fcfaf6]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--gold-light)] text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-[var(--gold-light)]">
            {providers.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">No providers yet — add your first above.</td></tr>
            ) : providers.map((p) => (
              <tr key={p.id} className="text-stone-700">
                <td className="px-4 py-3"><span className="font-semibold text-[var(--navy)]">{p.name}</span>{p.featured ? <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gold)]">★ Featured</span> : null}{p.basedIn ? <span className="block text-xs text-stone-500">{p.basedIn}</span> : null}</td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">{CAT_LABEL[p.category] ?? p.category}</td>
                <td className="px-4 py-3 text-xs text-stone-600">
                  {[p.phone, p.email].filter(Boolean).join(" · ") || "—"}
                  {/* Whether that number is actually reaching the page. */}
                  {p.phone && (
                    p.contactConsent
                      ? <span className="block text-[11px] text-emerald-700">Published — they agreed{p.contactConsentNote ? ` (${p.contactConsentNote})` : ""}</span>
                      : <span className="block text-[11px] text-amber-800">Held, not published — no permission recorded</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs">{p.published !== false ? <span className="text-emerald-700">Published</span> : <span className="text-stone-400">Hidden</span>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap"><button type="button" onClick={() => edit(p)} className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Edit</button><button type="button" onClick={() => remove(p.id)} className="ml-4 text-xs text-stone-400 hover:text-red-700">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
