"use client";

import { useState } from "react";
import { useActionState } from "react";
import { addFlightItineraryAction } from "@/app/admin/flight-itineraries/actions";

/**
 * The form the owner writes a flight itinerary in.
 *
 * Everything except the flights is a plain field the browser owns. The flights
 * are held in React state instead — there can be one or a dozen, added and
 * removed — and travel to the server as a single JSON field so the action does
 * not have to guess how many rows there were. When a save succeeds the form
 * empties itself back to one blank flight, ready for the next customer.
 */

type LegDraft = {
  key: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  cabin: string;
  confirmation: string;
  notes: string;
};

const field =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

function blankLeg(key: string): LegDraft {
  return {
    key,
    airline: "",
    flightNumber: "",
    from: "",
    to: "",
    departDate: "",
    departTime: "",
    arriveDate: "",
    arriveTime: "",
    cabin: "",
    confirmation: "",
    notes: "",
  };
}

export default function FlightItineraryBuilder({ storeReady }: { storeReady: boolean }) {
  const [state, act, busy] = useActionState(addFlightItineraryAction, null);
  const [legs, setLegs] = useState<LegDraft[]>(() => [blankLeg("leg-0")]);
  // The next integer to make a leg key from. Held in state, not a ref, so it
  // can be read and reset within render without touching a ref there.
  const [nextKey, setNextKey] = useState(1);
  // Bumped on each successful save. It keys the plain fields so they remount
  // empty, the way a form.reset() would clear them.
  const [generation, setGeneration] = useState(0);

  // After a save the server sends back ok:true. Empty the whole form so the
  // next itinerary starts clean rather than editing the last one. This is the
  // adjust-state-when-a-value-changes pattern React documents — a conditional
  // setState during render, no effect, so no cascading render.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.ok) {
      setLegs([blankLeg("leg-0")]);
      setNextKey(1);
      setGeneration((value) => value + 1);
    }
  }

  function addLeg() {
    setLegs((current) => [...current, blankLeg(`leg-${nextKey}`)]);
    setNextKey((value) => value + 1);
  }

  function removeLeg(key: string) {
    setLegs((current) => (current.length === 1 ? current : current.filter((leg) => leg.key !== key)));
  }

  function update(key: string, part: Partial<LegDraft>) {
    setLegs((current) => current.map((leg) => (leg.key === key ? { ...leg, ...part } : leg)));
  }

  // What the action reads. The client-only key is left out — it is for React,
  // not the server.
  const legsJson = JSON.stringify(
    legs.map((leg) => ({
      airline: leg.airline,
      flightNumber: leg.flightNumber,
      from: leg.from,
      to: leg.to,
      departDate: leg.departDate,
      departTime: leg.departTime,
      arriveDate: leg.arriveDate,
      arriveTime: leg.arriveTime,
      cabin: leg.cabin,
      confirmation: leg.confirmation,
      notes: leg.notes,
    })),
  );

  return (
    <form action={act} className="mt-6 grid gap-6">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. An itinerary cannot be saved until it is.
        </p>
      )}

      <input type="hidden" name="legs" value={legsJson} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Itinerary name</span>
          <input key={`title-${generation}`} name="title" disabled={busy} className={field} placeholder="Cohen family — Sukkos flights" />
        </label>
        <label className="block">
          <span className={label}>Passenger(s)</span>
          <input key={`passengers-${generation}`} name="passengers" disabled={busy} className={field} placeholder="Mr &amp; Mrs Cohen + 3" />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Booking reference (optional)</span>
          <input key={`reference-${generation}`} name="reference" disabled={busy} className={field} placeholder="A trip-wide reference, if there is one" />
        </label>
      </div>

      <div className="grid gap-5">
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">Flights</h3>
            <span className="text-xs text-stone-500">{legs.length} {legs.length === 1 ? "flight" : "flights"}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            One flight per leg, in order. For a connection, add the next flight — when it leaves from where the last one
            landed, the customer&rsquo;s page shows it as a connection with the layover.
          </p>
        </div>

        {legs.map((leg, index) => (
          <fieldset
            key={leg.key}
            className="rounded-xl border border-[var(--gold-light)] bg-[#fffdf9] p-5"
          >
            <div className="flex items-center justify-between">
              <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                Flight {index + 1}
              </legend>
              {legs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLeg(leg.key)}
                  disabled={busy}
                  className="text-xs font-semibold text-stone-400 transition hover:text-red-700 disabled:opacity-50"
                >
                  Remove flight
                </button>
              )}
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Airline</span>
                <input
                  value={leg.airline}
                  onChange={(e) => update(leg.key, { airline: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="El Al"
                />
              </label>
              <label className="block">
                <span className={label}>Flight number</span>
                <input
                  value={leg.flightNumber}
                  onChange={(e) => update(leg.key, { flightNumber: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="LY 315"
                />
              </label>
              <label className="block">
                <span className={label}>From</span>
                <input
                  value={leg.from}
                  onChange={(e) => update(leg.key, { from: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="JFK — New York"
                />
              </label>
              <label className="block">
                <span className={label}>To</span>
                <input
                  value={leg.to}
                  onChange={(e) => update(leg.key, { to: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="TLV — Tel Aviv"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Departs — date</span>
                  <input
                    type="date"
                    value={leg.departDate}
                    onChange={(e) => update(leg.key, { departDate: e.target.value })}
                    disabled={busy}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Time</span>
                  <input
                    value={leg.departTime}
                    onChange={(e) => update(leg.key, { departTime: e.target.value })}
                    disabled={busy}
                    className={field}
                    placeholder="23:40"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Arrives — date</span>
                  <input
                    type="date"
                    value={leg.arriveDate}
                    onChange={(e) => update(leg.key, { arriveDate: e.target.value })}
                    disabled={busy}
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className={label}>Time</span>
                  <input
                    value={leg.arriveTime}
                    onChange={(e) => update(leg.key, { arriveTime: e.target.value })}
                    disabled={busy}
                    className={field}
                    placeholder="17:05"
                  />
                </label>
              </div>
              <label className="block">
                <span className={label}>Cabin (optional)</span>
                <input
                  value={leg.cabin}
                  onChange={(e) => update(leg.key, { cabin: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="Economy"
                />
              </label>
              <label className="block">
                <span className={label}>Confirmation (optional)</span>
                <input
                  value={leg.confirmation}
                  onChange={(e) => update(leg.key, { confirmation: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="ABC123"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Note for this flight (optional)</span>
                <input
                  value={leg.notes}
                  onChange={(e) => update(leg.key, { notes: e.target.value })}
                  disabled={busy}
                  className={field}
                  placeholder="Seats 14A–14C · Terminal 4"
                />
              </label>
            </div>
          </fieldset>
        ))}

        <div>
          <button
            type="button"
            onClick={addLeg}
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--gold-light)] disabled:opacity-50"
          >
            + Add another flight
          </button>
        </div>
      </div>

      <label className="block">
        <span className={label}>Closing note for the customer (optional)</span>
        <textarea
          key={`notes-${generation}`}
          name="notes"
          rows={3}
          disabled={busy}
          className={field}
          placeholder="Check in online 24 hours before each flight. Bags: one checked, one cabin."
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !storeReady}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save itinerary"}
        </button>
        {state && (
          <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
