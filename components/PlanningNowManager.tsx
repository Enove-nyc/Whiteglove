"use client";

import { useActionState, useState } from "react";
import {
  CHIP_ICONS,
  MAX_CHIPS,
  MAX_LABEL_CHARS,
  chipState,
  type PlanningChip,
} from "@/data/planning-now";
import {
  deletePlanningChipAction,
  savePlanningChipAction,
  type ActionResult,
} from "@/app/admin/seasons/actions";
import { useOnActionSuccess } from "@/components/useOnActionSuccess";

/**
 * The chips that say what people are planning right now.
 *
 * EACH ROW SAYS WHETHER ANYBODY WILL SEE IT, in a word — Showing, Waiting, Off
 * or Finished. A chip that is switched on but out of season looks identical to
 * a broken one otherwise, and the owner should never have to compare two dates
 * in his head to work out which he is looking at.
 *
 * ONLY THE FIRST THREE SHOW. The list can hold more, so next winter's chips can
 * be written now and left to start on their own date; the row on the homepage
 * takes the three highest priorities that are in season. The count is said out
 * loud here because otherwise a fourth chip that never appears reads as a bug.
 *
 * THE LINK IS TYPED, NOT PICKED FROM A MENU, and that is deliberate: it points
 * at any existing list on the site, including a filtered one, and a menu would
 * have to be kept in step with every filter the site grows. It must start with
 * a slash — the server refuses anything that leaves the site.
 */
export default function PlanningNowManager({
  chips,
  today,
  storeReady,
}: {
  chips: PlanningChip[];
  today: string;
  storeReady: boolean;
}) {
  const [saveState, save, saving] = useActionState(savePlanningChipAction, null);
  const [removeState, remove, removing] = useActionState(deletePlanningChipAction, null);
  const [editing, setEditing] = useState<string | null>(null);

  useOnActionSuccess([saveState, removeState], () => setEditing(null));

  const message: ActionResult | null = saveState ?? removeState;
  const busy = saving || removing;
  const showing = chips.filter((c) => chipState(c, today) === "Showing").length;

  if (!storeReady) {
    return (
      <p className="mt-8 border border-[var(--gold-light)] bg-[#FAF8F3] px-4 py-3 text-sm leading-6 text-stone-600">
        The private store is not connected, so these cannot be changed yet.
      </p>
    );
  }

  const field = "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gold)]";
  const label = "block text-xs font-bold uppercase tracking-[0.1em] text-stone-500";
  const button = "inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] bg-white px-4 text-sm font-semibold text-[var(--navy)] disabled:opacity-60";

  function form(chip: PlanningChip | null) {
    return (
      <form action={save} className="mt-4 flex flex-col gap-4 border-t border-[var(--gold-light)] pt-4">
        {chip && <input type="hidden" name="id" value={chip.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor={`label-${chip?.id ?? "new"}`}>
              Label
            </label>
            <input
              id={`label-${chip?.id ?? "new"}`}
              name="label"
              defaultValue={chip?.label ?? ""}
              maxLength={MAX_LABEL_CHARS}
              placeholder="Winter sun"
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor={`href-${chip?.id ?? "new"}`}>
              Where it goes
            </label>
            <input
              id={`href-${chip?.id ?? "new"}`}
              name="href"
              defaultValue={chip?.href ?? ""}
              placeholder="/destinations?season=winter"
              className={field}
            />
            <p className="mt-1 text-xs leading-5 text-stone-500">
              A page on this site — a destination list, a filtered one, or a directory. Open it first and check it
              shows what the label promises.
            </p>
          </div>
          <div>
            <label className={label} htmlFor={`starts-${chip?.id ?? "new"}`}>
              Starts showing
            </label>
            <input id={`starts-${chip?.id ?? "new"}`} type="date" name="startsOn" defaultValue={chip?.startsOn ?? ""} className={field} />
          </div>
          <div>
            <label className={label} htmlFor={`ends-${chip?.id ?? "new"}`}>
              Stops showing
            </label>
            <input id={`ends-${chip?.id ?? "new"}`} type="date" name="endsOn" defaultValue={chip?.endsOn ?? ""} className={field} />
            <p className="mt-1 text-xs leading-5 text-stone-500">It disappears on its own after this — nothing to tidy.</p>
          </div>
          <div>
            <label className={label} htmlFor={`priority-${chip?.id ?? "new"}`}>
              Order
            </label>
            <input
              id={`priority-${chip?.id ?? "new"}`}
              type="number"
              name="priority"
              defaultValue={chip?.priority ?? 0}
              className={field}
            />
            <p className="mt-1 text-xs leading-5 text-stone-500">Higher shows first.</p>
          </div>
          <div>
            <label className={label} htmlFor={`icon-${chip?.id ?? "new"}`}>
              Icon (optional)
            </label>
            <select id={`icon-${chip?.id ?? "new"}`} name="icon" defaultValue={chip?.icon ?? ""} className={field}>
              <option value="">None</option>
              {CHIP_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
          <input type="checkbox" name="enabled" defaultChecked={chip ? chip.enabled : true} className="h-4 w-4" />
          Switched on
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={button}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={() => setEditing(null)} className={button}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="text-lg font-bold text-[var(--navy)]">Planning now</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        A short row under the search on the front page — “Winter sun”, “Pesach 2027” — each one opening a list this
        site already has. The {MAX_CHIPS} highest in order that are in season show; the rest wait for their dates.
        Write next winter&rsquo;s now and leave it to start on its own.
      </p>
      {chips.length > MAX_CHIPS && (
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {showing} showing today, out of {chips.length} written.
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`mt-4 border px-4 py-3 text-sm leading-6 ${
            message.ok ? "border-[var(--gold-light)] bg-[#FAF8F3] text-[var(--navy)]" : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.message}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-4">
        {chips.map((chip) => {
          const state = chipState(chip, today);
          return (
            <li key={chip.id} className="border border-[var(--gold-light)] bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-bold text-[var(--navy)]">{chip.label}</p>
                {/* The state in a word — never a colour on its own. */}
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500">{state}</p>
              </div>
              <p className="mt-1 break-all text-xs leading-5 text-stone-600">{chip.href}</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {chip.startsOn} to {chip.endsOn} · order {chip.priority}
                {chip.icon ? ` · ${chip.icon}` : ""}
              </p>
              {editing === chip.id ? (
                form(chip)
              ) : (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setEditing(chip.id)} className={button}>
                    Edit
                  </button>
                  <form action={remove}>
                    <input type="hidden" name="id" value={chip.id} />
                    <button type="submit" disabled={busy} className={button}>
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {editing === "new" ? (
        <div className="mt-6 border border-[var(--gold-light)] bg-white p-4">{form(null)}</div>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={`${button} mt-6`}>
          Add one
        </button>
      )}
    </section>
  );
}
