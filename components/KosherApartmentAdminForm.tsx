"use client";

import { useActionState } from "react";
import { addApartmentAction } from "@/app/admin/kosher-apartments/actions";

const field =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function KosherApartmentAdminForm({ storeReady }: { storeReady: boolean }) {
  const [state, act, busy] = useActionState(addApartmentAction, null);

  return (
    <form action={act} className="mt-6 grid max-w-2xl gap-4">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. A provider cannot be saved until it is.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Name</span>
          <input name="name" required disabled={busy} className={field} placeholder="Kosher Apartments Jerusalem" />
        </label>
        <label className="block">
          <span className={label}>Where they cover</span>
          <input name="area" required disabled={busy} className={field} placeholder="Jerusalem · or Worldwide" />
        </label>
      </div>

      <label className="block">
        <span className={label}>What they are (optional)</span>
        <input name="note" disabled={busy} className={field} placeholder="Short-term flats near the Old City, kosher kitchens." />
      </label>

      <p className="text-[11px] text-stone-500">Add at least one way to reach them.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={label}>Website (https://…)</span>
          <input name="url" type="url" disabled={busy} className={field} placeholder="https://…" />
        </label>
        <label className="block">
          <span className={label}>Phone</span>
          <input name="phone" disabled={busy} className={field} placeholder="+972 …" />
        </label>
        <label className="block">
          <span className={label}>WhatsApp</span>
          <input name="whatsapp" disabled={busy} className={field} placeholder="+972 …" />
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !storeReady}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add provider"}
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
