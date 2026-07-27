"use client";

import { useActionState } from "react";
import { type ActionResult, addBurialAction, addCemeteryAction, addInfoPageAction } from "@/app/admin/add/actions";

type CemeteryOption = { id: string; slug: string; name: string; city: string; country: string };

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const cardClass = "border border-[var(--gold-light)] bg-[#fcfaf6] p-6";
const submitClass =
  "border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>;
}

export default function AddEntryForms({ cemeteries }: { cemeteries: CemeteryOption[] }) {
  const [cemState, cemAction, cemPending] = useActionState<ActionResult | null, FormData>(addCemeteryAction, null);
  const [burState, burAction, burPending] = useActionState<ActionResult | null, FormData>(addBurialAction, null);
  const [pageState, pageAction, pagePending] = useActionState<ActionResult | null, FormData>(addInfoPageAction, null);

  return (
    <div className="space-y-8">
      {/* New cemetery */}
      <form action={cemAction} className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">New beis hachaim</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Add a cemetery</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Only a name and city are required — fill in the rest later. It appears in the directory right away, marked for verification.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={captionClass}>Cemetery name *</span><input name="name" className={inputClass} required /></label>
          <label className="block"><span className={captionClass}>Yiddish/Hebrew name</span><input name="yiddishName" dir="rtl" className={inputClass} /></label>
          <label className="block"><span className={captionClass}>City *</span><input name="city" className={inputClass} required /></label>
          <label className="block"><span className={captionClass}>City (Yiddish)</span><input name="yiddishCity" dir="rtl" className={inputClass} /></label>
          <label className="block"><span className={captionClass}>Country</span><input name="country" className={inputClass} /></label>
          <label className="block"><span className={captionClass}>Coordinates</span><input name="coordinates" className={inputClass} placeholder="50.0512, 19.9448" /></label>
          <label className="block sm:col-span-2"><span className={captionClass}>Address</span><input name="address" className={inputClass} /></label>
          <label className="block sm:col-span-2"><span className={captionClass}>Access note</span><textarea name="accessNote" rows={2} className={inputClass} /></label>
          <label className="block sm:col-span-2"><span className={captionClass}>Source URL</span><input name="sourceUrl" className={inputClass} /></label>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button type="submit" disabled={cemPending} className={submitClass}>{cemPending ? "Adding…" : "Add cemetery"}</button>
          <Status state={cemState} />
        </div>
      </form>

      {/* New tzadik */}
      <form action={burAction} className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">New kever</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Add a tzadik</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Add a burial to any cemetery. It shows on that cemetery&apos;s page.</p>
        {cemeteries.length === 0 ? (
          <p className="mt-4 text-sm text-amber-700">Add a cemetery first (or run the database import), then you can attach a tzadik to it.</p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className={captionClass}>Cemetery *</span>
                <select name="cemeteryId" className={inputClass} required defaultValue="">
                  <option value="" disabled>Choose a cemetery…</option>
                  {cemeteries.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}, {c.country}</option>)}
                </select>
              </label>
              <label className="block"><span className={captionClass}>Name *</span><input name="name" className={inputClass} required /></label>
              <label className="block"><span className={captionClass}>Yiddish/Hebrew name</span><input name="yiddishName" dir="rtl" className={inputClass} /></label>
              <label className="block"><span className={captionClass}>Known as</span><input name="knownAs" className={inputClass} placeholder="e.g. the Noam Elimelech" /></label>
              <label className="block"><span className={captionClass}>Yahrzeit</span><input name="yahrzeit" className={inputClass} /></label>
              <label className="block sm:col-span-2"><span className={captionClass}>Seforim</span><input name="seforim" dir="rtl" className={inputClass} /></label>
              <label className="block sm:col-span-2"><span className={captionClass}>Note</span><textarea name="note" rows={2} className={inputClass} /></label>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <button type="submit" disabled={burPending} className={submitClass}>{burPending ? "Adding…" : "Add tzadik"}</button>
              <Status state={burState} />
            </div>
          </>
        )}
      </form>

      {/* New page */}
      <form action={pageAction} className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">New page</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Add an info page</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">Create a standalone page with its own link (/info/…). Blank lines make paragraphs; start a line with &ldquo;## &rdquo; for a heading or &ldquo;- &rdquo; for a bullet.</p>
        <div className="mt-5 grid gap-4">
          <label className="block"><span className={captionClass}>Page title *</span><input name="title" className={inputClass} required /></label>
          <label className="block"><span className={captionClass}>Body</span><textarea name="body" rows={6} className={inputClass} placeholder="Write the page here — you can fill this in later too." /></label>
          <label className="block"><span className={captionClass}>Visibility</span>
            <select name="status" className={inputClass} defaultValue="PUBLISHED">
              <option value="PUBLISHED">Published — visible</option>
              <option value="DRAFT">Draft — hidden</option>
              <option value="NEEDS_REVIEW">Needs review — hidden</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button type="submit" disabled={pagePending} className={submitClass}>{pagePending ? "Creating…" : "Create page"}</button>
          <Status state={pageState} />
        </div>
      </form>
    </div>
  );
}
