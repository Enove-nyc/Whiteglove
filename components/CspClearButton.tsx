"use client";

import { useActionState } from "react";
import { clearCspReportsAction, type ActionResult } from "@/app/admin/settings/security/actions";

/**
 * Clears the collected CSP reports. A quiet button, not a headline — most of
 * the time the reports are the point and this is only pressed after the policy
 * has been widened and the old rows are about the old policy.
 */
export default function CspClearButton() {
  const [state, act, busy] = useActionState<ActionResult | null>(async () => clearCspReportsAction(), null);
  return (
    <form action={act} className="mt-6 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={busy}
        className="border border-[var(--gold-light)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:border-[var(--gold)] disabled:opacity-50"
      >
        {busy ? "Clearing…" : "Clear the collected reports"}
      </button>
      {state && <span className="text-sm text-stone-600">{state.message}</span>}
    </form>
  );
}
