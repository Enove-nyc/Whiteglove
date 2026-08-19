"use client";

import { useActionState } from "react";
import { addEruvAction } from "@/app/admin/eruvin/actions";

const field =
  "mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--gold)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function EruvAdminForm({ storeReady }: { storeReady: boolean }) {
  const [state, act, busy] = useActionState(addEruvAction, null);

  return (
    <form action={act} className="mt-6 grid max-w-2xl gap-4">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. An eruv cannot be saved until it is.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Eruv name</span>
          <input name="name" required disabled={busy} className={field} placeholder="The Golders Green Eruv" />
        </label>
        <label className="block">
          <span className={label}>Status link (https://…)</span>
          <input name="statusUrl" type="url" required disabled={busy} className={field} placeholder="https://…" />
        </label>
        <label className="block">
          <span className={label}>City</span>
          <input name="city" required disabled={busy} className={field} placeholder="London" />
        </label>
        <label className="block">
          <span className={label}>Country</span>
          <input name="country" required disabled={busy} className={field} placeholder="United Kingdom" />
        </label>
      </div>
      <label className="block">
        <span className={label}>What it covers (optional)</span>
        <input name="covers" disabled={busy} className={field} placeholder="Golders Green, Hendon and Temple Fortune" />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !storeReady}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add eruv"}
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
