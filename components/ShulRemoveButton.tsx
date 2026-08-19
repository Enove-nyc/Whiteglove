"use client";

import { useActionState } from "react";
import { removeShulAction } from "@/app/admin/shuls/actions";

/** Removes one owner-added shul. Built-in and database shuls have no remove button. */
export default function ShulRemoveButton({ id }: { id: string }) {
  const [state, act, busy] = useActionState(removeShulAction, null);
  return (
    <form action={act} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={busy}
        className="text-xs font-semibold text-stone-400 transition hover:text-red-700 disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      {state && !state.ok && <span className="text-xs text-red-700">{state.message}</span>}
    </form>
  );
}
