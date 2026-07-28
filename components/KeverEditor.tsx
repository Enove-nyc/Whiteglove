"use client";

import { useActionState, useMemo, useState } from "react";
import MixedText from "@/components/MixedText";
import {
  addCemeteryForPersonAction,
  addPersonToCemeteryAction,
  removePersonAction,
  type ActionResult,
} from "@/app/admin/kevarim/actions";

export type EditorCemetery = {
  slug: string;
  city: string;
  country: string;
  name: string;
  /** Names already in the built-in record — these live in code and can't be edited here. */
  builtIn: Array<{ name: string; knownAs?: string; yahrzeit?: string }>;
  /** People added through this screen. */
  stored: Array<{
    id: string;
    name: string;
    yiddishName: string;
    knownAs: string | null;
    seforim: string | null;
    yahrzeit: string | null;
    note: string | null;
  }>;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-[#fcfaf6] px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const cardClass = "border border-[var(--gold-light)] bg-[#fcfaf6] p-6";
const submitClass =
  "min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-60";

function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return <p className={`mt-3 text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>;
}

// useActionState with the tuple typed once rather than at each of the three calls.
function useFormAction(action: (prev: ActionResult | null, data: FormData) => Promise<ActionResult>) {
  return useActionState<ActionResult | null, FormData>(action, null);
}

/** The six fields that describe a person, shared by both directions. */
function PersonFields({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <label className="block">
        <span className={captionClass}>Name *</span>
        <input name="name" className={inputClass} placeholder="Rabbi Elimelech Weisblum" required />
      </label>
      <label className="block">
        <span className={captionClass}>Name in Hebrew</span>
        <input name="yiddishName" dir="rtl" className={inputClass} placeholder="רבי אלימלך מליזענסק" />
      </label>
      <label className="block">
        <span className={captionClass}>Known as</span>
        <input name="knownAs" className={inputClass} placeholder="The Noam Elimelech" />
      </label>
      <label className="block">
        <span className={captionClass}>Yahrzeit</span>
        <input name="yahrzeit" className={inputClass} placeholder="כ״א אדר · 5547 / 1787" />
      </label>
      <label className="block sm:col-span-2">
        <span className={captionClass}>Seforim</span>
        <input name="seforim" dir="rtl" className={inputClass} placeholder="נועם אלימלך" />
      </label>
      <label className="block sm:col-span-2">
        <span className={captionClass}>A line about him</span>
        <textarea name="note" rows={2} className={inputClass} placeholder="Whose son, whose talmid, and anything that keeps him from being confused with someone of the same name." id={`${idPrefix}-note`} />
      </label>
    </>
  );
}

export default function KeverEditor({ cemeteries }: { cemeteries: EditorCemetery[] }) {
  const [query, setQuery] = useState("");
  const [slug, setSlug] = useState(cemeteries[0]?.slug ?? "");

  const [addState, addAction, addPending] = useFormAction(addPersonToCemeteryAction);
  const [newState, newAction, newPending] = useFormAction(addCemeteryForPersonAction);
  const [removeState, removeAction] = useFormAction(removePersonAction);

  // 97 batei hachaim in one dropdown is a scroll, not a choice. Typing narrows
  // it; the selection is kept if it still matches so it can't silently jump to
  // a different cemetery mid-edit.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cemeteries;
    return cemeteries.filter((c) => `${c.city} ${c.country} ${c.name}`.toLowerCase().includes(q));
  }, [cemeteries, query]);

  const visible = matches.length ? matches : cemeteries;
  const selected = visible.find((c) => c.slug === slug) ?? visible[0];
  const activeSlug = selected?.slug ?? "";

  return (
    <div className="space-y-8">
      {/* ---- Direction 1: a person into a beis hachaim we already have ---- */}
      <section className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Add a person to a beis hachaim</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Someone buried in a place we already have</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Find the beis hachaim, see who is listed there now, and add whoever is missing. He appears on that
          cemetery&apos;s page straight away.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={captionClass}>Find a beis hachaim</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputClass}
              placeholder="Lizhensk, Kraków, Ukraine…"
            />
          </label>
          <label className="block">
            <span className={captionClass}>
              Beis hachaim {matches.length !== cemeteries.length && `· ${matches.length} of ${cemeteries.length}`}
            </span>
            <select value={activeSlug} onChange={(e) => setSlug(e.target.value)} className={inputClass}>
              {visible.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.city} · {c.country} — {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selected && (
          <>
            <div className="mt-6 border border-[var(--gold-light)] bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">Buried here now</h3>
                <a
                  href={`/cemeteries/${selected.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                >
                  Open the public page →
                </a>
              </div>
              {selected.builtIn.length === 0 && selected.stored.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">Nobody is listed yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--gold-light)]">
                  {selected.builtIn.map((b) => (
                    <li key={`builtin-${b.name}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                      <span className="text-sm text-stone-700">
                        <span className="font-semibold text-[var(--navy)]">{b.name}</span>
                        {b.knownAs && <span className="text-stone-500"> · {b.knownAs}</span>}
                        {b.yahrzeit && <span className="text-stone-400"> · <MixedText text={b.yahrzeit} /></span>}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">built in</span>
                    </li>
                  ))}
                  {selected.stored.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                      <span className="text-sm text-stone-700">
                        <span className="font-semibold text-[var(--navy)]">{b.name}</span>
                        {b.knownAs && <span className="text-stone-500"> · {b.knownAs}</span>}
                        {b.yahrzeit && <span className="text-stone-400"> · <MixedText text={b.yahrzeit} /></span>}
                      </span>
                      <form action={removeAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="slug" value={selected.slug} />
                        <button
                          type="submit"
                          className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <Status state={removeState} />
            </div>

            <form action={addAction} className="mt-6">
              <input type="hidden" name="slug" value={selected.slug} />
              <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                Add someone to {selected.city}
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                Typing a name that is already here corrects that entry instead of listing him twice.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <PersonFields idPrefix="add" />
              </div>
              <div className="mt-5">
                <button type="submit" disabled={addPending} className={submitClass}>
                  {addPending ? "Saving…" : "Add to this beis hachaim"}
                </button>
              </div>
              <Status state={addState} />
            </form>
          </>
        )}
      </section>

      {/* ---- Direction 2: a beis hachaim for a person we don't have yet ---- */}
      <section className={cardClass}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Add a beis hachaim to a person</p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Someone whose town isn&apos;t on the site yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Start from the person. Give the town he is buried in and both are created together — the beis hachaim
          appears in the directory with him in it.
        </p>

        <form action={newAction} className="mt-5">
          <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">The person</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <PersonFields idPrefix="new" />
          </div>

          <h3 className="mt-8 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">Where he is buried</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={captionClass}>Town *</span>
              <input name="city" className={inputClass} placeholder="Leżajsk" required />
            </label>
            <label className="block">
              <span className={captionClass}>Town in Hebrew</span>
              <input name="yiddishCity" dir="rtl" className={inputClass} placeholder="ליזענסק" />
            </label>
            <label className="block">
              <span className={captionClass}>Country</span>
              <input name="country" className={inputClass} placeholder="Poland" />
            </label>
            <label className="block">
              <span className={captionClass}>Coordinates</span>
              <input name="coordinates" className={inputClass} placeholder="50.251139, 22.422611" />
            </label>
            <label className="block sm:col-span-2">
              <span className={captionClass}>Name of the beis hachaim</span>
              <input name="cemeteryName" className={inputClass} placeholder="Leave blank and we call it “Leżajsk — Jewish cemetery”" />
            </label>
            <label className="block sm:col-span-2">
              <span className={captionClass}>Name in Hebrew</span>
              <input name="cemeteryYiddishName" dir="rtl" className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className={captionClass}>Address</span>
              <input name="address" className={inputClass} placeholder="Górna 16, 37-300 Leżajsk, Poland" />
            </label>
            <label className="block sm:col-span-2">
              <span className={captionClass}>Getting in</span>
              <textarea name="accessNote" rows={2} className={inputClass} placeholder="Who holds the key, when the gate is open." />
            </label>
            <label className="block sm:col-span-2">
              <span className={captionClass}>Source</span>
              <input name="sourceUrl" className={inputClass} placeholder="Where this came from" />
            </label>
          </div>

          <div className="mt-5">
            <button type="submit" disabled={newPending} className={submitClass}>
              {newPending ? "Saving…" : "Create the beis hachaim with him in it"}
            </button>
          </div>
          <Status state={newState} />
        </form>
      </section>

      <p className="border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-stone-600">
        Leave a coordinate blank unless you know the actual grave. Travelers drive to whatever this page gives
        them, and an approximate pin at the wrong end of a town is worse than an address and a phone call.
      </p>
    </div>
  );
}
