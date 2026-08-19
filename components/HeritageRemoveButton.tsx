"use client";

import { useActionState } from "react";
import { removeHeritageAction } from "@/app/admin/heritage-cemeteries/actions";

/** Removes one owner-added heritage cemetery. Built-in entries have no remove button. */
export default function HeritageRemoveButton({ slug }: { slug: string }) {
  const [state, act, busy] = useActionState(removeHeritageAction, null);
  return (
    <form action={act} className="inline-flex items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
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
