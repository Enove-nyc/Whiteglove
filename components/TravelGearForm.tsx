"use client";

import { useActionState, useState } from "react";
import { saveGearAction } from "@/app/admin/settings/travel-gear/actions";
import {
  describeGearItem,
  describeGearItems,
  gearCtaFor,
  gearItemProblem,
  GEAR_IDEAS,
  gearListProblem,
  MAX_GEAR_ITEMS,
  type TravelGearItem,
} from "@/lib/travel-gear";

/**
 * Adding a product to the travel-gear shelf.
 *
 * NO AUTO-FILL FROM A LINK. Amazon's Product Advertising API is the only
 * sanctioned way to pull a picture, description and price from a link, and
 * Amazon does not grant or keep API access for an Associates account without
 * 3 qualifying sales in its first 180 days — see lib/travel-gear.ts. So every
 * field here is typed in, same as the name and link always have been on the
 * rest of this site's affiliate cards.
 *
 * A PRICE NEEDS A DATE. Typing today's date next to a price is the whole of
 * what keeps a printed price honest once it goes stale — see
 * gearItemProblem, which refuses a price with no date attached.
 */

const input =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const label = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const blank = (name = ""): TravelGearItem => ({
  id: `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
  name,
  description: "",
  imageUrl: "",
  price: "",
  priceCheckedAt: "",
  url: "",
  cta: "",
});

export default function TravelGearForm({ current, storeReady }: { current: TravelGearItem[]; storeReady: boolean }) {
  const [rows, setRows] = useState<TravelGearItem[]>(current);
  const [state, act, busy] = useActionState(saveGearAction, null);

  const update = (id: string, patch: Partial<TravelGearItem>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const problem = gearListProblem(rows);
  const unused = GEAR_IDEAS.filter((idea) => !rows.some((r) => r.name.trim().toLowerCase() === idea.toLowerCase()));

  return (
    <form action={act} className="mt-6 space-y-6">
      {/* The whole list travels as one field — rows are added and removed in
          the browser, so posting them individually would mean a name for
          every row and a way to say which were deleted. */}
      <input type="hidden" name="items" value={JSON.stringify(rows)} />

      <p className="text-sm leading-6 text-stone-600">{describeGearItems(rows)}</p>

      {rows.length < MAX_GEAR_ITEMS && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRows([...rows, blank()])}
            className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Add one
          </button>
          {unused.length > 0 && <span className="text-xs text-stone-500">or start from —</span>}
          {unused.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setRows([...rows, blank(idea)])}
              className="rounded-full border border-[var(--gold-light)] px-3 py-1.5 text-xs text-[var(--navy)] hover:border-[var(--gold)]"
            >
              {idea}
            </button>
          ))}
        </div>
      )}

      {rows.map((row, index) => (
        <div key={row.id} className="rounded-lg border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
          <div className="flex items-start justify-between gap-4">
            <span className={label}>Item {index + 1}</span>
            <button
              type="button"
              onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-700 underline"
            >
              Remove
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Name</span>
              <input
                type="text"
                value={row.name}
                onChange={(e) => update(row.id, { name: e.target.value })}
                placeholder="Travel Shabbos blech"
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Button words</span>
              <input
                type="text"
                value={row.cta ?? ""}
                onChange={(e) => update(row.id, { cta: e.target.value })}
                placeholder={gearCtaFor({ ...row, cta: "" })}
                className={input}
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className={label}>Description</span>
            <input
              type="text"
              value={row.description}
              onChange={(e) => update(row.id, { description: e.target.value })}
              placeholder="Folds flat, fits a carry-on, keeps food warm without a flame."
              className={input}
            />
          </label>

          <label className="mt-3 block">
            <span className={label}>Amazon (or other) link</span>
            <input
              type="text"
              value={row.url}
              onChange={(e) => update(row.id, { url: e.target.value })}
              placeholder="Paste your affiliate link"
              className={`${input} font-mono text-xs`}
            />
          </label>

          <label className="mt-3 block">
            <span className={label}>Picture link (optional)</span>
            <input
              type="text"
              value={row.imageUrl}
              onChange={(e) => update(row.id, { imageUrl: e.target.value })}
              placeholder="Paste a link to a picture — Amazon does not hand one over automatically yet"
              className={`${input} font-mono text-xs`}
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Price</span>
              <input
                type="text"
                value={row.price}
                onChange={(e) => {
                  const price = e.target.value;
                  // Stamping "checked today" the moment a price is typed is
                  // one less thing to remember, and correcting it is still
                  // one click away below.
                  update(row.id, { price, priceCheckedAt: price.trim() && !row.priceCheckedAt ? today() : row.priceCheckedAt });
                }}
                placeholder="$24.99"
                className={input}
              />
            </label>
            <label className="block">
              <span className={label}>Price checked on</span>
              <input
                type="date"
                value={row.priceCheckedAt}
                onChange={(e) => update(row.id, { priceCheckedAt: e.target.value })}
                className={input}
              />
            </label>
          </div>

          {row.imageUrl.trim() && (
            // eslint-disable-next-line @next/next/no-img-element -- a preview of an owner-pasted external URL
            <img src={row.imageUrl} alt="" className="mt-3 h-24 w-24 rounded-md border border-[var(--gold-light)] object-cover" />
          )}

          <p className={`mt-2 text-xs leading-5 ${gearItemProblem(row) ? "text-red-700" : "text-stone-500"}`}>
            {describeGearItem(row)}
          </p>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || !storeReady || Boolean(problem)}
          className="bg-[var(--navy)] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save the shelf"}
        </button>
        {problem && <span className="text-sm font-semibold text-red-700">{problem}</span>}
        {state && !problem && (
          <span className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
