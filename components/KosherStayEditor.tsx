"use client";

import { useActionState } from "react";
import type { KosherStay } from "@/data/kosher-stays";
import { saveKosherStayAction, type ActionResult } from "@/app/admin/directory/stays/[slug]/edit/actions";

/**
 * Editing one owner-added place to stay.
 *
 * Unlike the vacation-destination editor, an empty box here really does mean
 * an empty field — a stay has no built-in text underneath it to fall back to,
 * because only owner-added stays (see lib/admin-listing-catalog.ts) ever
 * reach this screen. Every box is pre-filled with the row as it stands, and
 * saving writes every field back, the same shape addKosherStayAction wrote it
 * the first time.
 */

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] shadow-sm transition focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

type ConfirmedKey =
  | "onSiteKosherFood"
  | "kosherKitchen"
  | "kosherBreakfast"
  | "shabbosMeals"
  | "nearbyKosherFood"
  | "nearbyShulOrMinyan"
  | "eruv"
  | "shabbosElevator"
  | "kitchenSelfCatering"
  | "walkingDistanceToJewishArea";

const CONFIRMED_FIELDS: Array<[ConfirmedKey, string]> = [
  ["onSiteKosherFood", "On-site kosher food"],
  ["kosherKitchen", "Kosher kitchen"],
  ["kosherBreakfast", "Kosher breakfast"],
  ["shabbosMeals", "Shabbos meals available"],
  ["nearbyKosherFood", "Kosher food nearby"],
  ["nearbyShulOrMinyan", "Shul / minyan nearby"],
  ["eruv", "Within an eruv"],
  ["shabbosElevator", "Shabbos elevator"],
  ["kitchenSelfCatering", "Self-catering kitchen"],
  ["walkingDistanceToJewishArea", "Walking distance to Jewish area"],
];

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p className={`mt-3 text-sm font-semibold ${state.ok ? "text-[var(--navy)]" : "text-red-700"}`} role="status">
      {state.message}
    </p>
  );
}

export default function KosherStayEditor({ stay }: { stay: KosherStay }) {
  const [saved, save, saving] = useActionState(saveKosherStayAction, null);

  return (
    <form action={save} className="space-y-6 rounded-2xl border border-[var(--gold-light)] bg-white p-6">
      <input type="hidden" name="slug" value={stay.slug} />

      {/* Common fields first: what it is called, where it is, what it claims
          about kashrus, and the Shabbos attributes travelers actually filter
          on — the source and internal notes come last. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={captionClass}>Name *</span>
          <input name="name" defaultValue={stay.name} className={inputClass} required />
        </label>
        <label className="block">
          <span className={captionClass}>Kind</span>
          <select name="kind" defaultValue={stay.kind} className={inputClass}>
            <option>Kosher hotel</option>
            <option>Kosher B&amp;B</option>
            <option>Seasonal kosher programme</option>
            <option>Kosher-friendly, in the Jewish quarter</option>
            <option>Ordinary hotel, well placed</option>
          </select>
        </label>
        <label className="block">
          <span className={captionClass}>City *</span>
          <input name="city" defaultValue={stay.city} className={inputClass} required />
        </label>
        <label className="block">
          <span className={captionClass}>Country</span>
          <input name="country" defaultValue={stay.country} className={inputClass} />
        </label>
      </div>

      <label className="block">
        <span className={captionClass}>One line — what it is *</span>
        <input name="summary" defaultValue={stay.summary} className={inputClass} required />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={captionClass}>Measured from — the shul or quarter *</span>
          <input name="anchorName" defaultValue={stay.anchor.name} className={inputClass} required />
        </label>
        <label className="block">
          <span className={captionClass}>That place&rsquo;s coordinates *</span>
          <input name="anchorCoords" defaultValue={stay.anchor.coordinates} className={inputClass} required />
        </label>
        <label className="block">
          <span className={captionClass}>Kashrus</span>
          <select name="kosherClaim" defaultValue={stay.kosherClaim} className={inputClass}>
            <option value="none">No kosher claim — listed for where it stands</option>
            <option value="reported">Reported kosher — not checked by us</option>
            <option value="confirmed">Confirmed — you checked it yourself</option>
          </select>
        </label>
        <label className="block">
          <span className={captionClass}>Season, if it is a programme rather than a place</span>
          <input name="season" defaultValue={stay.season ?? ""} className={inputClass} placeholder="Pesach only; July–August" />
        </label>
      </div>

      <div className="rounded-lg border border-dashed border-[var(--gold)] p-4">
        <p className={captionClass}>Kosher / Shabbos attributes</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Leave anything you have not checked as &ldquo;Not checked&rdquo; — it stays invisible to customers. Only a
          &ldquo;Yes&rdquo; ever shows as a badge on the card or matches a filter.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CONFIRMED_FIELDS.map(([key, label]) => (
            <label className="block" key={key}>
              <span className={captionClass}>{label}</span>
              <select name={key} defaultValue={stay[key] ?? "unknown"} className={inputClass}>
                <option value="unknown">Not checked</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className={captionClass}>Shabbos access info — keys, entry codes, anything relevant</span>
            <input name="shabbosAccessInfo" defaultValue={stay.shabbosAccessInfo ?? ""} className={inputClass} placeholder="Optional" />
          </label>
        </div>
      </div>

      {/* Less common / internal fields last. */}
      <label className="block">
        <span className={captionClass}>Website</span>
        <input name="website" defaultValue={stay.website ?? ""} className={inputClass} />
      </label>
      <label className="block">
        <span className={captionClass}>Notes — one per line</span>
        <textarea name="notes" rows={4} defaultValue={(stay.notes ?? []).join("\n")} className={inputClass} />
      </label>
      <label className="block">
        <span className={captionClass}>Source *</span>
        <input name="sourceUrl" defaultValue={stay.sourceUrl} className={inputClass} placeholder="https://…" required />
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--gold-light)] pt-5">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center rounded-md bg-[var(--navy)] px-6 text-sm font-bold uppercase tracking-[0.1em] text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <Result state={saved} />
    </form>
  );
}
