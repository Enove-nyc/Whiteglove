"use client";

import { useActionState } from "react";
import { forgetSearchAction, type ActionResult } from "@/app/admin/reports/actions";

/**
 * Take one search term off the not-found list.
 *
 * Its own small component because each row needs its own form, and a form
 * cannot be nested inside the list's markup any other way.
 *
 * On success the row itself normally disappears — the term is gone from the
 * store and the screen revalidates — so the message below is the fallback for
 * the moment before that lands, rather than the usual outcome. Without it a
 * slow revalidation looks like a button that did nothing, and the owner
 * presses it again.
 */
export default function ForgetSearchButton({ term }: { term: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(forgetSearchAction, null);

  if (state?.ok) return <span className="text-sm font-semibold text-emerald-700">{state.message}</span>;

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="term" value={term} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center border border-[var(--gold-light)] px-3 text-xs font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700 disabled:opacity-60"
      >
        {pending ? "…" : "Not needed"}
      </button>
      {state && !state.ok && <span className="text-sm font-semibold text-red-700">{state.message}</span>}
    </form>
  );
}
