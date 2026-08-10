"use client";

import { useActionState } from "react";
import { saveReferralAction } from "@/app/admin/settings/referral/actions";
import type { ReferralSettings } from "@/lib/referral";

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";

export default function AdminReferralForm({
  current,
  storeReady,
}: {
  current: ReferralSettings;
  storeReady: boolean;
}) {
  const [state, act, busy] = useActionState(saveReferralAction, null);

  return (
    <form action={act} className="mt-6 space-y-5">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. Settings cannot be saved until UPSTASH_REDIS_REST_URL and _TOKEN are set.
        </p>
      )}

      <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
        <input type="checkbox" name="enabled" defaultChecked={current.enabled} disabled={!storeReady || busy} className="mt-1" />
        <span>
          <span className="font-semibold text-[var(--navy)]">Programme is on for visitors</span>
          <span className="block text-stone-500">
            Leave this off until reward rules are final. Off is the default and the safe state — no public launch, no invented rewards.
          </span>
        </span>
      </label>

      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Reward rules (shown when on)</span>
        <textarea
          name="rulesText"
          defaultValue={current.rulesText}
          rows={5}
          disabled={!storeReady || busy}
          placeholder="Write the real rules when you have them. Leave blank until then — do not invent amounts."
          className={input}
        />
      </label>

      <button
        type="submit"
        disabled={!storeReady || busy}
        className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save referral settings"}
      </button>
      {state?.message && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
