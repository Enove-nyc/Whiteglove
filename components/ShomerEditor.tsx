"use client";

import { useActionState, useState } from "react";
import SearchableSelect from "@/components/SearchableSelect";
import { removeShomerAction, retireShomerAction, saveShomerAction, type ActionResult } from "@/app/admin/shomrim/actions";

export type ShomerCemetery = {
  slug: string;
  city: string;
  country: string;
  name: string;
  builtIn: Array<{ label: string; name?: string; phone?: string; email?: string; note: string }>;
  stored: Array<{ id: string; label: string; name: string | null; phone: string | null; email: string | null; note: string | null }>;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-[#fcfaf6] px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const submitClass =
  "min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return <p className={`mt-3 text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>;
}

export default function ShomerEditor({ cemeteries }: { cemeteries: ShomerCemetery[] }) {
  const [slug, setSlug] = useState(cemeteries[0]?.slug ?? "");
  const [saveState, saveAction, savePending] = useActionState<ActionResult | null, FormData>(saveShomerAction, null);
  const [removeState, removeAction] = useActionState<ActionResult | null, FormData>(removeShomerAction, null);
  const [retireState, retireAction] = useActionState<ActionResult | null, FormData>(retireShomerAction, null);

  const selected = cemeteries.find((c) => c.slug === slug);

  // What the page actually shows: a stored contact wins over the built-in one
  // with the same label, and one with no phone and no email is retired.
  const storedByLabel = new Map((selected?.stored ?? []).map((c) => [c.label.trim().toLowerCase(), c]));
  const rows = [
    ...(selected?.builtIn ?? []).map((c) => {
      const override = storedByLabel.get(c.label.trim().toLowerCase());
      return { label: c.label, builtIn: c, override, isNew: false };
    }),
    ...(selected?.stored ?? [])
      .filter((c) => !(selected?.builtIn ?? []).some((b) => b.label.trim().toLowerCase() === c.label.trim().toLowerCase()))
      .map((c) => ({ label: c.label, builtIn: undefined, override: c, isNew: true })),
  ];

  return (
    <div className="space-y-8">
      <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        {/* 146 batei hachaim: type the town rather than scrolling for it. */}
        <SearchableSelect
          id="shomer-cemetery"
          label="Beis hachaim"
          value={slug}
          onChange={setSlug}
          placeholder="Type a town — Lizhensk, Kraków, Uman…"
          options={cemeteries.map((c) => ({
            value: c.slug,
            label: `${c.city} · ${c.country}`,
            hint: c.name,
            keywords: c.slug,
          }))}
        />
        {selected && (
          <p className="mt-3 text-sm text-stone-600">
            <a href={`/cemeteries/${selected.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
              Open the public page →
            </a>
          </p>
        )}
      </div>

      {selected && (
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Numbers on this page now</h2>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No contacts yet. Add one below.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((row) => {
                const live = row.override ?? row.builtIn;
                const retired = row.override && !row.override.phone?.trim() && !row.override.email?.trim();
                return (
                  <li key={row.label} className="border border-[var(--gold-light)] bg-white p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-[var(--navy)]">{row.label}</p>
                      {(live?.name ?? undefined) && <p className="text-xs text-stone-500">Ask for {live?.name}</p>}
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
                        {retired ? "hidden" : row.override ? (row.isNew ? "added by you" : "edited by you") : "built in"}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${retired ? "text-stone-400 line-through" : "text-stone-700"}`}>
                      {live?.phone || live?.email || "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!retired && row.builtIn && !row.override && (
                        <form action={retireAction}>
                          <input type="hidden" name="slug" value={selected.slug} />
                          <input type="hidden" name="label" value={row.label} />
                          <button type="submit" className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700">
                            Number no longer works — hide it
                          </button>
                        </form>
                      )}
                      {row.override && (
                        <form action={removeAction}>
                          <input type="hidden" name="id" value={row.override.id} />
                          <input type="hidden" name="slug" value={selected.slug} />
                          <button type="submit" className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700">
                            {row.isNew ? "Remove this contact" : "Undo my change"}
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Status state={removeState} />
          <Status state={retireState} />
        </div>
      )}

      <form action={saveAction} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add or correct a number</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Use the same label as an existing contact to correct it — &ldquo;Shomer&rdquo; typed again replaces the
          number that is there. A new label adds a contact.
        </p>
        <input type="hidden" name="slug" value={slug} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={captionClass}>Label</span>
            <input name="label" list="shomer-labels" className={inputClass} placeholder="Shomer" required />
            <datalist id="shomer-labels">
              {(selected?.builtIn ?? []).map((c) => <option key={c.label} value={c.label} />)}
              <option value="Shomer" />
              <option value="Local guide" />
              <option value="Caretaker" />
            </datalist>
          </label>
          <label className="block">
            {/* Kept apart from the label on purpose: the label is what a save
                matches on to correct an existing number, so a person's name in
                it means one man spelled two ways becomes two contacts. */}
            <span className={captionClass}>Who to ask for</span>
            <input name="name" className={inputClass} placeholder="Reb Berel — the name, not the role" />
          </label>
          <label className="block">
            <span className={captionClass}>Phone</span>
            <input name="phone" type="tel" className={inputClass} placeholder="+48 …" />
          </label>
          <label className="block">
            <span className={captionClass}>Email</span>
            <input name="email" type="email" className={inputClass} />
          </label>
          <label className="block">
            <span className={captionClass}>Note</span>
            <input name="note" className={inputClass} placeholder="When to call, what to ask for" />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={savePending} className={submitClass}>{savePending ? "Saving…" : "Save number"}</button>
        </div>
        <Status state={saveState} />
        <p className="mt-4 border-l-4 border-[var(--gold)] bg-white px-3 py-2 text-xs leading-5 text-stone-600">
          Only enter a number you have confirmed. Travelers ring these from the roadside, and a wrong
          number is worse than none.
        </p>
      </form>
    </div>
  );
}
