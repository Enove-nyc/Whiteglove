"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateLong, type Itinerary } from "@/data/itinerary";
import {
  addStop,
  daysOf,
  describeEdits,
  editStop,
  moveToDay,
  moveWithinDay,
  newStopId,
  NO_DATE,
  removeStop,
  withDays,
  type EditableDay,
} from "@/lib/shared-trip-edit";

/**
 * Changing somebody else's trip, when they said you could.
 *
 * "Can edit" was offered on the sharing screen, honoured by the server, and
 * reachable from nowhere: an editor opened the link and got the read-only page
 * a viewer gets, having been told they could change it. This is the screen
 * that was missing.
 *
 * RENDERS NOTHING UNLESS THE SERVER SAYS SO. Whether this person may edit is
 * asked of the server and never assumed — the browser is exactly where
 * somebody would claim to be an editor. A viewer or a commenter sees no
 * panel at all rather than a disabled one, because an editing box that
 * refuses is worse than no box.
 *
 * STOPS, NOT BOOKINGS — see lib/shared-trip-edit.ts for why, and the note in
 * the panel that tells the editor so before they go looking.
 */

type Loaded = { itinerary: Itinerary; canEdit: boolean };

/**
 * Ask the server for the trip and for whether this person may change it.
 *
 * Outside the component and holding no state of its own, so the effect below
 * sets state from a resolved promise rather than by calling something that
 * sets it — which is what the repo's react-hooks/set-state-in-effect rule
 * asks for, and is right: an effect that sometimes settles immediately and
 * sometimes a tick later renders one answer and then another.
 */
async function fetchShared(shareId: string): Promise<Loaded | null> {
  try {
    const res = await fetch(`/api/account/itinerary/shared?share=${encodeURIComponent(shareId)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { itinerary: Itinerary | null; canEdit?: boolean };
    if (!data.itinerary || !data.canEdit) return null;
    return { itinerary: data.itinerary, canEdit: true };
  } catch {
    // Not being offered the panel is the safe failure. The page below it still
    // shows the trip.
    return null;
  }
}

export default function SharedTripEditor({ shareId, ownerName }: { shareId: string; ownerName: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [days, setDays] = useState<EditableDay[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [adding, setAdding] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetchShared(shareId).then((result) => {
      if (!active || !result) return;
      setLoaded(result);
      setDays(daysOf(result.itinerary));
    });
    return () => {
      active = false;
    };
  }, [shareId]);

  /** Re-read the trip after a save, or after finding the copy on screen is stale. */
  async function reload() {
    const result = await fetchShared(shareId);
    if (!result) return;
    setLoaded(result);
    setDays(daysOf(result.itinerary));
  }

  if (!loaded || !days) return null;

  const next = withDays(loaded.itinerary, days);
  const summary = describeEdits(loaded.itinerary, next);
  const dirty = summary !== "Nothing changed yet";

  async function save() {
    if (!loaded || !days) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const res = await fetch(`/api/account/itinerary/shared?share=${encodeURIComponent(shareId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary: withDays(loaded.itinerary, days),
          // So a save cannot quietly overwrite something the owner changed
          // while this panel was open.
          expectedUpdatedAt: loaded.itinerary.updatedAt,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; staleCopy?: boolean } | null;
      if (!res.ok) {
        setError(data?.error || "Could not save your changes.");
        // A stale copy is not a failure to retry blindly — reload so the
        // editor is looking at what is actually on the trip now.
        if (data?.staleCopy) await reload();
        return;
      }
      setSaved("Saved to the trip.");
      await reload();
      router.refresh();
    } catch {
      setError("Could not reach the server. Your changes are still on screen.");
    } finally {
      setBusy(false);
    }
  }

  const label = "text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]";
  const field = "w-full border border-[var(--gold-light)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]";
  const chip = "border border-[var(--gold-light)] px-2 py-1 text-[11px] font-semibold text-[var(--navy)] disabled:opacity-40";

  return (
    <section className="mt-6 border border-[var(--gold)] bg-white p-6" aria-labelledby="editor-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className={label}>You can change this trip</p>
          <h2 id="editor-heading" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
            {ownerName} let you edit
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Move the stops around, change what they say, add one or take one out. Flights and where everybody is
            sleeping stay with {ownerName}.
          </p>
        </div>
        <button type="button" onClick={() => setOpen((was) => !was)} className={`${chip} px-4 py-3`}>
          {open ? "Close" : "Edit the stops"}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-6 border-t border-[var(--gold-light)] pt-6">
          {days.map((day) => (
            <div key={day.date || "undated"}>
              <p className={label}>{day.date === NO_DATE ? "Not on a day yet" : formatDateLong(day.date)}</p>
              <ul className="mt-2 space-y-3">
                {day.stops.map((stop, index) => (
                  <li key={stop.id} className="border border-[var(--gold-light)] p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                      <input
                        aria-label="Stop"
                        value={stop.name}
                        onChange={(event) => setDays(editStop(days, stop.id, { name: event.target.value }))}
                        className={field}
                      />
                      <input
                        aria-label="Time"
                        value={stop.startTime ?? ""}
                        placeholder="09:30"
                        onChange={(event) => setDays(editStop(days, stop.id, { startTime: event.target.value }))}
                        className={field}
                      />
                    </div>
                    <input
                      aria-label="Note"
                      value={stop.notes ?? ""}
                      placeholder="A note about this stop"
                      onChange={(event) => setDays(editStop(days, stop.id, { notes: event.target.value }))}
                      className={`${field} mt-2`}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={chip}
                        disabled={index === 0}
                        onClick={() => setDays(moveWithinDay(days, day.date, stop.id, -1))}
                      >
                        ↑ Earlier
                      </button>
                      <button
                        type="button"
                        className={chip}
                        disabled={index === day.stops.length - 1}
                        onClick={() => setDays(moveWithinDay(days, day.date, stop.id, 1))}
                      >
                        ↓ Later
                      </button>
                      {days.length > 1 && (
                        <select
                          aria-label="Move to another day"
                          value={day.date}
                          onChange={(event) => setDays(moveToDay(days, stop.id, event.target.value))}
                          className={chip}
                        >
                          {days.map((option) => (
                            <option key={option.date || "undated"} value={option.date}>
                              {option.date === NO_DATE ? "Not on a day yet" : option.date}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className={`${chip} ml-auto text-red-700`}
                        onClick={() => setDays(removeStop(days, stop.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  aria-label={`Add a stop on ${day.date || "the undated day"}`}
                  value={adding[day.date] ?? ""}
                  placeholder="Add a stop"
                  onChange={(event) => setAdding({ ...adding, [day.date]: event.target.value })}
                  className={`${field} max-w-xs`}
                />
                <button
                  type="button"
                  className={chip}
                  disabled={!(adding[day.date] ?? "").trim()}
                  onClick={() => {
                    setDays(addStop(days, day.date, adding[day.date] ?? "", newStopId(() => crypto.randomUUID())));
                    setAdding({ ...adding, [day.date]: "" });
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--gold-light)] pt-4">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !dirty}
              className="bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : `Save to ${ownerName}'s trip`}
            </button>
            {/* Said in words before it happens: this is somebody else's trip. */}
            <span className="text-sm text-stone-600">{summary}</span>
            {saved && <span className="text-sm font-semibold text-emerald-800">{saved}</span>}
            {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
