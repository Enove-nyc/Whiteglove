"use client";

import { useActionState } from "react";
import type { AddedAirport, AddedMetro } from "@/lib/airport-admin";
import { describeMetro, isBuiltInAirport, isBuiltInMetro } from "@/lib/airport-admin";
import type { Airport } from "@/data/airports";
import { type ActionResult, removeAirportAction, saveAirportAction, saveMetroAction } from "@/app/admin/airports/actions";

/**
 * Adding an airport, and grouping a city's airports together.
 *
 * The built-in list is shown but not editable here — it is a file in the
 * repository, and a form that appeared to delete JFK would be lying about what
 * it does. What the owner adds sits on top of it, and saving an entry that is
 * already there corrects it rather than making a second one.
 */

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const caption = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

function Said({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>;
}

function RemoveButton({ code, kind }: { code: string; kind: "airport" | "metro" }) {
  const [state, act, busy] = useActionState(removeAirportAction, null);
  return (
    <form action={act} className="inline">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="kind" value={kind} />
      <button type="submit" disabled={busy} className="text-[11px] font-bold uppercase tracking-[0.1em] text-stone-400 hover:text-red-700 disabled:opacity-50">
        {busy ? "…" : "Remove"}
      </button>
      {state && !state.ok && <span className="ml-2 text-[11px] font-semibold text-red-700">{state.message}</span>}
    </form>
  );
}

export default function AirportAdmin({
  merged,
  added,
  metros,
  addedMetros,
  storeReady,
}: {
  merged: Airport[];
  added: AddedAirport[];
  metros: Record<string, { label: string; country: string }>;
  addedMetros: AddedMetro[];
  storeReady: boolean;
}) {
  const [airportState, saveAirport, savingAirport] = useActionState(saveAirportAction, null);
  const [metroState, saveMetro, savingMetro] = useActionState(saveMetroAction, null);

  if (!storeReady) {
    return (
      <p className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-stone-600">
        The private store is not connected, so nothing can be added yet. The {merged.length} built-in airports and{" "}
        {Object.keys(metros).length} city groups are working as they always have.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold-ink)]">Add or correct</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">An airport</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          A regional field near a kever town, or a correction to one of the {merged.length} already here. Saving a code
          that already exists replaces it — that is how a wrong coordinate or a missing spelling gets fixed.
        </p>
        <form action={saveAirport} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block"><span className={caption}>Code</span><input name="code" required maxLength={3} placeholder="RZE" className={`${input} uppercase`} /></label>
          <label className="block sm:col-span-2"><span className={caption}>Name</span><input name="name" required placeholder="Rzeszów — Jasionka" className={input} /></label>
          <label className="block"><span className={caption}>City or town it serves</span><input name="city" required placeholder="Rzeszów" className={input} /></label>
          <label className="block"><span className={caption}>Country</span><input name="country" required placeholder="Poland" className={input} /></label>
          <label className="block"><span className={caption}>City group (optional)</span><input name="cityCode" maxLength={3} placeholder="NYC" className={`${input} uppercase`} /></label>
          <label className="block"><span className={caption}>Latitude</span><input name="lat" required inputMode="decimal" placeholder="50.11" className={input} /></label>
          <label className="block"><span className={caption}>Longitude</span><input name="lng" required inputMode="decimal" placeholder="22.02" className={input} /></label>
          <label className="block lg:col-span-3">
            <span className={caption}>Also searched by</span>
            <input name="aliases" placeholder="lizhensk, lezajsk, lancut" className={input} />
            <span className="mt-1 block text-xs leading-5 text-stone-500">
              Commas between them. The towns and spellings people actually type — this is what makes somebody
              searching &ldquo;lizhensk&rdquo; find the airport an hour away.
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
            <button type="submit" disabled={savingAirport} className="min-h-11 rounded-md bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50">
              {savingAirport ? "Saving…" : "Save the airport"}
            </button>
            <Said state={airportState} />
          </div>
        </form>

        {added.length > 0 && (
          <div className="mt-6 border-t border-[var(--gold-light)] pt-4">
            <p className={caption}>Yours</p>
            <ul className="mt-2 space-y-2 text-sm">
              {added.map((a) => (
                <li key={a.code} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--gold-light)] bg-white px-3 py-2">
                  <span>
                    <strong className="text-[var(--navy)]">{a.code}</strong> — {a.name}, {a.city}
                    {a.cityCode && <span className="ml-2 text-xs text-stone-500">in {a.cityCode}</span>}
                    {isBuiltInAirport(a.code) && <span className="ml-2 text-xs text-[var(--gold-ink)]">correcting a built-in one</span>}
                  </span>
                  <RemoveButton code={a.code} kind="airport" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold-ink)]">Searched together</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">City groups</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Somebody flying to a city with two airports usually does not mind which. A group is offered above the
          individual airports, and searches them together. <strong className="text-[var(--navy)]">Put the airports in
          the group first</strong> — set each one&apos;s city group above — then name it here.
        </p>
        <form action={saveMetro} className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block"><span className={caption}>Group code</span><input name="code" required maxLength={3} placeholder="KRW" className={`${input} uppercase`} /></label>
          <label className="block"><span className={caption}>What a traveller sees</span><input name="label" required placeholder="Kraków — all airports" className={input} /></label>
          <label className="block"><span className={caption}>Country</span><input name="country" required placeholder="Poland" className={input} /></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button type="submit" disabled={savingMetro} className="min-h-11 rounded-md bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] disabled:opacity-50">
              {savingMetro ? "Saving…" : "Save the group"}
            </button>
            <Said state={metroState} />
          </div>
        </form>

        <div className="mt-6 border-t border-[var(--gold-light)] pt-4">
          <p className={caption}>Every group</p>
          <ul className="mt-2 space-y-2 text-sm">
            {Object.entries(metros).map(([code, area]) => (
              <li key={code} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--gold-light)] bg-white px-3 py-2">
                <span>
                  <strong className="text-[var(--navy)]">{code}</strong> — {area.label}
                  <span className="ml-2 text-xs text-stone-500">{describeMetro(code, merged)}</span>
                </span>
                {/* Built-in groups live in a file. A Remove button here would
                    say it had done something it cannot do. */}
                {isBuiltInMetro(code) ? (
                  <span className="text-[11px] uppercase tracking-[0.1em] text-stone-400">Built in</span>
                ) : (
                  <RemoveButton code={code} kind="metro" />
                )}
              </li>
            ))}
          </ul>
          {addedMetros.length === 0 && (
            <p className="mt-3 text-xs leading-5 text-stone-500">
              The six above came with the site. Anything you add appears here too.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
