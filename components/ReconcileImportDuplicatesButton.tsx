"use client";

import { useActionState } from "react";
import { reconcileImportDuplicatesAction } from "@/app/admin/imports/actions";

export default function ReconcileImportDuplicatesButton() {
  const [state, action, pending] = useActionState(reconcileImportDuplicatesAction, null);

  return (
    <form action={action} className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center border border-[var(--gold)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {pending ? "Scanning doubles…" : "Rescan same-place doubles"}
      </button>
      {state?.message && (
        <p className={`max-w-xs text-right text-xs leading-5 ${state.ok ? "text-stone-600" : "text-rose-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
