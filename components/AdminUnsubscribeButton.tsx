"use client";

import { useActionState } from "react";
import { adminUnsubscribeAlert } from "@/app/admin/alerts/actions";

export default function AdminUnsubscribeButton({ email }: { email: string }) {
  const [state, act, busy] = useActionState(adminUnsubscribeAlert, null);

  return (
    <form action={act} className="inline">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 border border-[var(--gold-light)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-stone-600 disabled:opacity-60"
      >
        {busy ? "…" : "Unsubscribe"}
      </button>
      {state && !state.ok && (
        <span role="alert" className="ml-2 text-xs text-red-700">
          {state.message}
        </span>
      )}
    </form>
  );
}
