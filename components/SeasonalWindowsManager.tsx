"use client";

import { useActionState, useState } from "react";
import {
  SPOTLIGHT_COPY,
  SPOTLIGHT_LABEL,
  isOpen,
  sortForAdmin,
  windowProblem,
  type SeasonalWindow,
  type SpotlightKey,
} from "@/data/seasonal-spotlight";
import { resetSeasonAction, saveSeasonAction, type ActionResult } from "@/app/admin/seasons/actions";
import { useOnActionSuccess } from "@/components/useOnActionSuccess";

/**
 * Three rows, and each one says plainly whether anybody will see it.
 *
 * WHY THE COUNT IS ON THE ROW. A window can be open, switched on and featured
 * and still show nothing, because no destination answers that category — and
 * without the count on screen that reads as a broken feature rather than an
 * empty one. So the row says how many destinations answer it and what the
 * floor is, which turns "it is not working" into "two more destinations need
 * the tag".
 *
 * DERIVED IS SHOWN AS DERIVED. Pesach and Sukkos come from the Jewish calendar
 * and are right every year without anybody touching them; the row says so, and
 * saving replaces them for good, which is why Reset exists next to Save.
 */
export default function SeasonalWindowsManager({
  windows,
  today,
  counts,
  minimum,
  storeReady,
}: {
  windows: SeasonalWindow[];
  today: string;
  counts: Record<string, number>;
  minimum: number;
  storeReady: boolean;
}) {
  const [saveState, save, saving] = useActionState(saveSeasonAction, null);
  const [resetState, reset, resetting] = useActionState(resetSeasonAction, null);
  const [editing, setEditing] = useState<SpotlightKey | null>(null);

  useOnActionSuccess([saveState, resetState], () => setEditing(null));

  const message: ActionResult | null = saveState ?? resetState;
  const busy = saving || resetting;

  if (!storeReady) {
    return (
      <p className="mt-8 border border-[var(--gold-light)] bg-[#FAF8F3] px-4 py-3 text-sm leading-6 text-stone-600">
        The private store is not connected, so these cannot be changed yet.
      </p>
    );
  }

  const field = "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]";
  const label = "block text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]";

  return (
    <div className="mt-8">
      {message && (
        <p className={`mb-4 text-sm font-semibold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.message}</p>
      )}

      <ul className="divide-y divide-[var(--gold-light)] rounded-lg border border-[var(--gold-light)]">
        {sortForAdmin(windows, today).map((window) => {
          const behind = counts[window.key] ?? 0;
          const showing = isOpen(window, today) && behind >= minimum;
          const open = editing === window.key;
          return (
            <li key={window.key} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--navy)]">{SPOTLIGHT_LABEL[window.key]}</span>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                        showing
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-stone-300 bg-stone-50 text-stone-600"
                      }`}
                    >
                      {showing ? "Showing now" : "Not showing"}
                    </span>
                    {window.featured && (
                      <span className="shrink-0 rounded-full border border-[var(--gold)] bg-[#FAF8F3] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">
                        Featured
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {window.startsOn && window.endsOn ? (
                      <>
                        {window.startsOn} → {window.endsOn}
                        {window.derived ? " · from the Jewish calendar" : " · your dates"}
                        {window.active ? "" : " · switched off"}
                      </>
                    ) : (
                      // Yeshiva week before anybody has set it: not a broken
                      // row, an empty one, and it should read that way.
                      "No dates set — it is not a date the calendar can work out."
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{window.note.trim() || SPOTLIGHT_COPY[window.key].blurb}</p>
                  {/* The honest reason a switched-on window still shows nothing. */}
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {behind >= minimum
                      ? `${behind} destinations answer this.`
                      : `${behind} of ${minimum} destinations answer this — it will not show until ${minimum} do. Tag them on Destinations, in “Best for”.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(open ? null : window.key)}
                  className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-[var(--navy)] underline sm:min-h-0"
                >
                  {open ? "Close" : "Change"}
                </button>
              </div>

              {open && (
                <form action={save} className="mt-4 space-y-4 rounded-lg border border-[var(--gold)] bg-white p-4">
                  <input type="hidden" name="key" value={window.key} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={label}>Starts showing</span>
                      <input type="date" name="startsOn" defaultValue={window.startsOn} className={field} />
                    </label>
                    <label className="block">
                      <span className={label}>Stops showing</span>
                      <input type="date" name="endsOn" defaultValue={window.endsOn} className={field} />
                    </label>
                  </div>

                  <label className="block">
                    <span className={label}>Your own line</span>
                    <input
                      name="note"
                      defaultValue={window.note}
                      placeholder={SPOTLIGHT_COPY[window.key].blurb}
                      className={field}
                    />
                    <span className="mt-1 block text-xs text-stone-500">
                      Leave it empty for the built-in line. Nothing here should name a programme or a price.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
                    <input type="checkbox" name="active" defaultChecked={window.active} className="mt-1 size-4 shrink-0" />
                    <span>
                      <span className="font-semibold text-[var(--navy)]">On</span> — show it inside those dates.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
                    <input type="checkbox" name="featured" defaultChecked={window.featured} className="mt-1 size-4 shrink-0" />
                    <span>
                      <span className="font-semibold text-[var(--navy)]">Featured</span> — wins when two windows overlap.
                      Only one can be, so this takes it off the others.
                    </span>
                  </label>

                  {/* Said before saving only when there is nothing there yet —
                      the yeshiva week row arrives empty by design. */}
                  {windowProblem(window) && !window.startsOn && !window.endsOn && (
                    <p className="text-sm font-semibold text-amber-800">
                      Set both dates and switch it on. Nothing shows until you do.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex min-h-11 items-center rounded-full bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="inline-flex min-h-11 items-center rounded-full border border-[var(--gold-light)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {open && !window.derived && (
                <form action={reset} className="mt-3">
                  <input type="hidden" name="key" value={window.key} />
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-stone-600 underline disabled:opacity-50 sm:min-h-0"
                  >
                    {window.key === "yeshiva-week" ? "Remove this window" : "Back to the calendar's own dates"}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
