"use client";

import AddressAutocomplete from "@/components/AddressAutocomplete";

import Link from "next/link";
import { useActionState } from "react";
import { type ActionResult, addCemeteryAction, addInfoPageAction } from "@/app/admin/add/actions";

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

export default function AddEntryForms() {
  const [cemState, cemAction, cemPending] = useActionState<ActionResult | null, FormData>(addCemeteryAction, null);
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
          <label className="block sm:col-span-2"><span className={captionClass}>Address</span><AddressAutocomplete name="address" className={inputClass} placeholder="Start typing the address…" /></label>
          <label className="block sm:col-span-2"><span className={captionClass}>Access note</span><textarea name="accessNote" rows={2} className={inputClass} /></label>
          <label className="block sm:col-span-2"><span className={captionClass}>Source URL</span><input name="sourceUrl" className={inputClass} /></label>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button type="submit" disabled={cemPending} className={submitClass}>{cemPending ? "Adding…" : "Add cemetery"}</button>
          <Status state={cemState} />
        </div>
      </form>

      {/* New tzadik — this screen's picker could only ever list cemeteries that
          had a database row, which the 97 built-in batei hachaim don't. Adding a
          person now lives on /admin/kevarim, where every beis hachaim on the
          site is offered and the row is created on demand. */}
      <div className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">New kever</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Add a tzadik</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Adding a person has its own screen now, so you can pick any beis hachaim on the site — including the
          built-in ones — see who is already listed there, and take someone off again if you add him by mistake.
        </p>
        <Link href="/admin/kevarim" className={`mt-5 inline-block ${submitClass}`}>Open the kevarim screen</Link>
      </div>

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
