"use client";

import { useActionState } from "react";
import { saveMembershipAction } from "@/app/admin/settings/membership/actions";
import type { MembershipFoundationSettings } from "@/lib/growth-settings";

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";

export default function AdminMembershipForm({
  current,
  storeReady,
}: {
  current: MembershipFoundationSettings;
  storeReady: boolean;
}) {
  const [state, act, busy] = useActionState(saveMembershipAction, null);

  return (
    <form action={act} className="mt-6 space-y-5">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. Notes cannot be saved until it is.
        </p>
      )}

      <fieldset>
        <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Public product status</legend>
        <div className="mt-2 space-y-2">
          <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
            <input type="radio" name="status" value="planned" defaultChecked={current.status !== "disabled"} disabled={!storeReady || busy} className="mt-1" />
            <span>
              <span className="font-semibold text-[var(--navy)]">Planned only</span>
              <span className="block text-stone-500">Documented for later. Not advertised, not priced, not sold.</span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
            <input type="radio" name="status" value="disabled" defaultChecked={current.status === "disabled"} disabled={!storeReady || busy} className="mt-1" />
            <span>
              <span className="font-semibold text-[var(--navy)]">Not offered</span>
              <span className="block text-stone-500">Kept off on purpose. Same public effect — still nothing to buy.</span>
            </span>
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Internal notes (never public)</span>
        <textarea
          name="internalNotes"
          defaultValue={current.internalNotes}
          rows={4}
          disabled={!storeReady || busy}
          placeholder="Benefits under consideration, legal questions, launch blockers…"
          className={input}
        />
      </label>

      <button
        type="submit"
        disabled={!storeReady || busy}
        className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save membership stub"}
      </button>
      {state?.message && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
