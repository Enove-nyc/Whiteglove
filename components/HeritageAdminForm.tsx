"use client";

import { useActionState } from "react";
import { addHeritageAction } from "@/app/admin/heritage-cemeteries/actions";

const field =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function HeritageAdminForm({ storeReady }: { storeReady: boolean }) {
  const [state, act, busy] = useActionState(addHeritageAction, null);

  return (
    <form action={act} className="mt-6 grid max-w-2xl gap-4">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. An entry cannot be saved until it is.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Name</span>
          <input name="name" required disabled={busy} className={field} placeholder="Bratislava — beis hachaim" />
        </label>
        <label className="block">
          <span className={label}>Details link (https://…)</span>
          <input name="sourceUrl" type="url" required disabled={busy} className={field} placeholder="https://app.nesiyatova.com/…" />
        </label>
        <label className="block">
          <span className={label}>City</span>
          <input name="city" required disabled={busy} className={field} placeholder="Bratislava" />
        </label>
        <label className="block">
          <span className={label}>Country</span>
          <input name="country" required disabled={busy} className={field} placeholder="Slovakia" />
        </label>
        <label className="block">
          <span className={label}>Coordinates (puts it on the map)</span>
          <input name="coordinates" required disabled={busy} className={field} placeholder="48.1486, 17.1077" />
        </label>
        <label className="block">
          <span className={label}>Address (optional)</span>
          <input name="address" disabled={busy} className={field} placeholder="Žižkova, Bratislava" />
        </label>
      </div>
      <p className="text-xs leading-5 text-stone-500">
        A locator entry is a point with a source — no details are copied here. The details link is where the page
        forwards for access, hours and contacts.
      </p>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !storeReady}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add cemetery"}
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
