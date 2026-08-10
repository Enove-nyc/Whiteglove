"use client";

import { useActionState } from "react";
import { savePlacementsAction } from "@/app/admin/settings/earnings/placements-actions";
import { TRAVEL_PRODUCTS } from "@/lib/affiliate/partners";
import type { DestinationPlacementSettings } from "@/lib/growth-settings";

/** Only hotel/flight/car are wired on destination pages today. */
const DESTINATION_PRODUCTS = TRAVEL_PRODUCTS.filter((p) =>
  ["hotel", "flight", "car"].includes(p.value),
);

export default function AdminPlacementsForm({
  current,
  storeReady,
  routeNotes,
}: {
  current: DestinationPlacementSettings;
  storeReady: boolean;
  /** Live partner status lines from resolve/routeFor — never invent partners. */
  routeNotes: Array<{ product: string; label: string; earns: boolean; note: string }>;
}) {
  const [state, act, busy] = useActionState(savePlacementsAction, null);

  return (
    <form action={act} className="mt-6 space-y-5">
      {!storeReady && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The private store is not connected. Placement choices cannot be saved until it is.
        </p>
      )}

      <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
        <input
          type="checkbox"
          name="sectionEnabled"
          defaultChecked={current.sectionEnabled}
          disabled={!storeReady || busy}
          className="mt-1"
        />
        <span>
          <span className="font-semibold text-[var(--navy)]">Show “Book the practical pieces” on destination pages</span>
          <span className="block text-stone-500">
            Even when on, a category only appears if a real partner link can be built — empty categories stay hidden.
          </span>
        </span>
      </label>

      <fieldset>
        <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">Categories allowed on destination pages</legend>
        <ul className="mt-2 space-y-2">
          {DESTINATION_PRODUCTS.map((product) => {
            const route = routeNotes.find((r) => r.product === product.value);
            return (
              <li key={product.value}>
                <label className="flex cursor-pointer gap-3 text-sm leading-6 text-stone-700">
                  <input
                    type="checkbox"
                    name="product"
                    value={product.value}
                    defaultChecked={current.enabledProducts.includes(product.value)}
                    disabled={!storeReady || busy}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold text-[var(--navy)]">{product.label}</span>
                    {route && (
                      <span className="block text-stone-500">
                        {route.earns ? "Earning when clicked. " : "Link may work but is not earning yet. "}
                        {route.note}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p className="text-sm leading-6 text-stone-500">
        Transfers, insurance, eSIMs and programmes appear only when you add them under travel extras below — never as empty buttons.
        The commission disclosure uses the editable line under Settings → The website&apos;s words.
      </p>

      <button
        type="submit"
        disabled={!storeReady || busy}
        className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save destination placements"}
      </button>
      {state?.message && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
