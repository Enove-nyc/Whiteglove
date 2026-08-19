"use client";

import { useActionState } from "react";
import { addShulAction } from "@/app/admin/shuls/actions";

const field =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function ShulAdminForm({ storeReady }: { storeReady: boolean }) {
  const [state, act, busy] = useActionState(addShulAction, null);

  return (
    <form action={act} className="mt-6 grid max-w-2xl gap-4">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. A shul cannot be saved until it is.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Shul name</span>
          <input name="name" required disabled={busy} className={field} placeholder="Bevis Marks Synagogue" />
        </label>
        <label className="block">
          <span className={label}>Source link (https://…)</span>
          <input name="sourceUrl" type="url" required disabled={busy} className={field} placeholder="https://…" />
        </label>
        <label className="block">
          <span className={label}>City</span>
          <input name="city" required disabled={busy} className={field} placeholder="London" />
        </label>
        <label className="block">
          <span className={label}>Country</span>
          <input name="country" required disabled={busy} className={field} placeholder="United Kingdom" />
        </label>
        <label className="block">
          <span className={label}>Address (optional)</span>
          <input name="address" disabled={busy} className={field} placeholder="4 Heneage Lane, London EC3A 5DQ" />
        </label>
        <label className="block">
          <span className={label}>Website (optional)</span>
          <input name="website" type="url" disabled={busy} className={field} placeholder="https://…" />
        </label>
        <label className="block">
          <span className={label}>Phone (optional)</span>
          <input name="phone" disabled={busy} className={field} placeholder="+44 …" />
        </label>
        <label className="block">
          <span className={label}>Coordinates (optional — puts it on the map)</span>
          <input name="coordinates" disabled={busy} className={field} placeholder="51.5144, -0.0792" />
        </label>
      </div>
      <label className="block">
        <span className={label}>Notes (optional)</span>
        <input name="notes" disabled={busy} className={field} placeholder="Sephardi; the oldest in the UK." />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !storeReady}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add shul"}
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
