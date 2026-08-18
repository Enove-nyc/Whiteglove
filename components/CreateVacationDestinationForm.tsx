"use client";

import { useActionState } from "react";
import { SEASONS, TRIP_THEMES } from "@/data/vacation-destinations";
import { createDestinationAction } from "@/app/admin/vacation-destinations/actions";

/**
 * Adding a holiday destination the site did not ship with.
 *
 * ASKS FOR FOUR THINGS AND NO MORE. A destination page is assembled from
 * listings the site already holds, so the only fields it genuinely cannot be
 * rendered without are what it is called, where it is, which towns it joins
 * against, and one sentence on why anybody would go. Everything else is
 * written afterwards on the same screen as an edit, which means adding one is
 * a minute's work rather than a form nobody finishes.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function CreateVacationDestinationForm() {
  const [state, create, pending] = useActionState(createDestinationAction, null);

  return (
    <form action={create} className="space-y-5 rounded-2xl border border-[var(--gold-light)] bg-white p-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Add a destination</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Four things now, the rest whenever you like. It goes live as soon as you save.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={captionClass}>Name</span>
          <input name="name" required placeholder="Lake Como" className={inputClass} />
        </label>
        <label className="block">
          <span className={captionClass}>Country</span>
          <input name="country" required placeholder="Italy" className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className={captionClass}>Towns</span>
        <input name="cities" required placeholder="Como, Bellagio, Varenna" className={inputClass} />
        <span className="mt-1 block text-xs text-stone-400">
          Separated by commas, spelled exactly as they are on your listings. The page is built from what the site holds
          in these towns — spell one differently and that section comes out empty.
        </span>
      </label>

      <label className="block">
        <span className={captionClass}>Why go — one sentence</span>
        <textarea name="whyGo" required rows={2} className={inputClass} />
      </label>

      <label className="block">
        <span className={captionClass}>Overview (optional)</span>
        <textarea name="overview" rows={3} className={inputClass} />
      </label>

      <fieldset>
        <legend className={captionClass}>What kind of trip</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {TRIP_THEMES.map((theme) => (
            <label key={theme.value} className="flex items-center gap-2 text-sm text-[var(--navy)]">
              <input type="checkbox" name="themes" value={theme.value} />
              {theme.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={captionClass}>When in the year</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {SEASONS.map((season) => (
            <label key={season.value} className="flex items-center gap-2 text-sm text-[var(--navy)]">
              <input type="checkbox" name="seasons" value={season.value} />
              {season.label}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-md bg-[var(--navy)] px-6 text-sm font-bold uppercase tracking-[0.1em] text-white disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add it"}
      </button>

      {state && (
        <p className={`text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
