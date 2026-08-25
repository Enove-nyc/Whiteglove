"use client";

import { useEffect, useState } from "react";
import { byCategory, type PackingList } from "@/data/packing-list";
import { matchGearToItems, type GearLink } from "@/data/packing-gear-match";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * The travel-gear shelf is read on the server (app/packing/page.tsx) and
 * handed down, rather than fetched again from here: it is the same shelf for
 * every visitor, it is already cached there, and a list of product names is
 * nothing this component needs a round trip for.
 */
export default function PackingListPanel({ gear = [] }: { gear?: GearLink[] }) {
  const [tripId, setTripId] = useState("");
  const [list, setList] = useState<PackingList | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/account/packing?trip=current", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          setError(data?.error || "Could not load the packing list.");
        } else {
          setTripId(data?.tripId || "");
          setList(data?.list ?? null);
          setStale(Boolean(data?.stale));
        }
      } catch {
        if (active) setError("Could not reach the account service.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function generate() {
    if (!tripId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/account/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, action: "generate" }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.list) {
        setList(data.list);
        setStale(false);
      } else {
        setError(data?.error || "Could not generate a packing list right now.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function toggle(itemId: string, checked: boolean) {
    if (!list) return;
    setList({ ...list, items: list.items.map((i) => (i.id === itemId ? { ...i, checked } : i)) });
    await fetch("/api/account/packing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, action: "toggle", itemId, checked }),
    }).catch(() => undefined);
  }

  // Only the lines that name something on the shelf outright — see
  // data/packing-gear-match.ts for why this refuses far more than it links.
  const gearFor = list ? matchGearToItems(list.items, gear) : {};

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (!tripId) return <p className="text-sm text-stone-500">Open a trip in the planner first.</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {!list ? (
        <EmptyState
          title="No packing list yet"
          description="Generate one from this trip's destinations, dates and planned stops."
          action={
            <Button type="button" onClick={generate} disabled={generating}>
              {generating ? "Generating…" : "Generate packing list"}
            </Button>
          }
        />
      ) : (
        <>
          {stale && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              This trip has changed since the list was made — regenerate it to catch up.
            </div>
          )}
          <div className="flex flex-col gap-5">
            {byCategory(list.items).map((group) => (
              <div key={group.category}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">{group.category}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => void toggle(item.id, e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--gold-light)]"
                        />
                        <span className={item.checked ? "text-stone-400 line-through" : ""}>{item.label}</span>
                      </label>
                      {gearFor[item.id] && !item.checked && (
                        <a
                          href={gearFor[item.id].url}
                          target="_blank"
                          // "sponsored" is what an affiliate link is, and the
                          // one rel search engines ask for by name.
                          rel="sponsored nofollow noopener noreferrer"
                          className="ml-6 text-xs font-semibold text-[var(--gold-ink)] underline underline-offset-2"
                        >
                          Where to get one →
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <Button type="button" variant="secondary" onClick={generate} disabled={generating}>
              {generating ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
