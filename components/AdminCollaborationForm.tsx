"use client";

import { useActionState } from "react";
import { saveCollaborationAction } from "@/app/admin/settings/collaboration/actions";
import type { CollaborationSettings } from "@/lib/growth-settings";

export default function AdminCollaborationForm({
  current,
  storeReady,
}: {
  current: CollaborationSettings;
  storeReady: boolean;
}) {
  const [state, act, busy] = useActionState(saveCollaborationAction, null);

  return (
    <form action={act} className="mt-6 space-y-4">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. Switches cannot be saved until it is.
        </p>
      )}

      {(
        [
          ["votingEnabled", "Group voting", "People with comment or edit access can vote for or against hotels, restaurants and activities."],
          ["sharedFavoritesEnabled", "Shared favorites", "A shared list of places the group wants to keep in view."],
          ["roomGroupsEnabled", "Room groupings", "Assign travelers to rooms on the itinerary planner."],
        ] as const
      ).map(([name, title, detail]) => (
        <label key={name} className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
          <input
            type="checkbox"
            name={name}
            defaultChecked={current[name]}
            disabled={!storeReady || busy}
            className="mt-1"
          />
          <span>
            <span className="font-semibold text-[var(--navy)]">{title}</span>
            <span className="block text-stone-500">{detail}</span>
          </span>
        </label>
      ))}

      <p className="text-sm leading-6 text-stone-500">
        This screen does not show private trip contents — only whether the tools are available. Abuse reports still come through Contact.
      </p>

      <button
        type="submit"
        disabled={!storeReady || busy}
        className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save group planning switches"}
      </button>
      {state?.message && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
