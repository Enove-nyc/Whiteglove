"use client";

import { useActionState, useEffect, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import HechsherBadge from "@/components/HechsherBadge";
import { clearHechsherAction, saveHechsherAction, type ActionResult } from "@/app/admin/hechsherim/actions";
import { HECHSHERIM, type HechsherStatus } from "@/data/hechsherim";
import { coordinatesToPoint } from "@/data/route-utils";
import { fetchKosherPlaces, type KosherPlace } from "@/lib/kosher-osm";
import { hechsherOf } from "@/lib/use-hechsherim";

// Confirming a hechsher, one place at a time.
//
// Pick a town, get the kosher places OpenStreetMap knows about, and say what
// each one holds. Nothing is filled in on your behalf: where OSM records a
// certification it is shown as reported and attributed, and everything else
// sits at unverified until it is confirmed here against something real.

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";
const smallButton =
  "min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:opacity-50";

export type ConfirmedRow = HechsherStatus & { placeId: string; placeName?: string; placeAddress?: string };

export default function HechsherEditor({ confirmed, storeReady }: { confirmed: ConfirmedRow[]; storeReady: boolean }) {
  const [town, setTown] = useState("");
  const [coords, setCoords] = useState("");
  const [places, setPlaces] = useState<KosherPlace[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, HechsherStatus>>({});
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const [saveState, saveAction, savePending] = useActionState<ActionResult | null, FormData>(saveHechsherAction, null);
  const [clearState, clearAction] = useActionState<ActionResult | null, FormData>(clearHechsherAction, null);

  // Re-read after a save so the badge in the list matches what was just
  // stored. The form stays open on purpose — the badge changing underneath it
  // is the confirmation, and closing it would hide that.
  useEffect(() => {
    if (!saveState?.ok && !clearState?.ok) return;
    if (!places?.length) return;
    let live = true;
    void (async () => {
      const ids = places.map((p) => p.id).join(",");
      const res = await fetch(`/api/kosher/hechsherim?ids=${encodeURIComponent(ids)}`);
      if (live && res.ok) setStatuses((await res.json()).hechsherim ?? {});
    })();
    return () => {
      live = false;
    };
  }, [saveState, clearState, places]);

  async function search(coordinates: string, label: string) {
    const point = coordinatesToPoint(coordinates);
    if (!point) {
      setNote("Pick a town from the list so we have its location.");
      return;
    }
    setSearching(true);
    setNote("");
    try {
      const found = await fetchKosherPlaces(point, 15);
      setPlaces(found);
      if (!found.length) setNote(`OpenStreetMap lists no kosher places within 15 km of ${label || "there"}.`);
      if (found.length) {
        const res = await fetch(`/api/kosher/hechsherim?ids=${encodeURIComponent(found.map((p) => p.id).join(","))}`);
        if (res.ok) setStatuses((await res.json()).hechsherim ?? {});
      }
    } catch {
      setNote("Could not reach OpenStreetMap just now. Try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-8">
      {!storeReady && (
        <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Confirming a hechsher needs the private store connected (UPSTASH_REDIS_REST_URL and _TOKEN). Until then every
          place reads unverified — which is the honest reading anyway, just not one you can change.
        </p>
      )}

      <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Find places to confirm</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Pick a town and mark what each place holds. Nothing is guessed for you. Where OpenStreetMap records a
          certification it is shown as <strong>reported</strong> and credited to OSM; it still reads unverified to
          travelers until you confirm it here.
        </p>

        <div className="mt-4 max-w-sm">
          <label className="block">
            <span className={captionClass}>Town</span>
            <AddressAutocomplete
              mode="city"
              value={town}
              onChange={(city, c) => {
                setTown(city);
                if (c) {
                  setCoords(c);
                  void search(c, city);
                }
              }}
              placeholder="Kraków, Lakewood, Yerushalayim…"
              className={inputClass}
            />
          </label>
          {coords && (
            <button type="button" disabled={searching} onClick={() => void search(coords, town)} className={`${smallButton} mt-3`}>
              {searching ? "Searching…" : "Search again"}
            </button>
          )}
        </div>
        {note && <p className="mt-3 text-sm text-stone-600">{note}</p>}

        {places && places.length > 0 && (
          <ul className="mt-5 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
            {places.map((p) => {
              const status = hechsherOf(statuses, p);
              return (
                <li key={p.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--navy)]">{p.name}</p>
                      <p className="text-sm text-stone-500">{[p.category, p.address].filter(Boolean).join(" · ")}</p>
                      <div className="mt-2">
                        <HechsherBadge status={status} size="sm" />
                      </div>
                    </div>
                    <button type="button" onClick={() => setEditing(editing === p.id ? null : p.id)} className={smallButton}>
                      {editing === p.id ? "Close" : "Set the hechsher"}
                    </button>
                  </div>

                  {editing === p.id && (
                    <form action={saveAction} className="mt-4 border border-[var(--gold-light)] bg-white p-4">
                      <input type="hidden" name="placeId" value={p.id} />
                      <input type="hidden" name="placeName" value={p.name} />
                      <input type="hidden" name="placeAddress" value={p.address ?? ""} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className={captionClass}>What did you find?</span>
                          <select name="state" defaultValue={status.state === "reported" ? "certified" : status.state} className={inputClass}>
                            <option value="certified">I confirmed it has a hechsher</option>
                            <option value="none">I confirmed it has none</option>
                            <option value="reported">Someone says so, I have not checked</option>
                            <option value="unverified">I do not know yet</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className={captionClass}>Which hechsher</span>
                          <select name="hechsherId" defaultValue={status.hechsherId ?? ""} className={inputClass}>
                            <option value="">— not on the list —</option>
                            {HECHSHERIM.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} ({h.region})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block sm:col-span-2">
                          <span className={captionClass}>If it is not on the list, type it</span>
                          <input name="note" defaultValue={status.note ?? ""} className={inputClass} />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className={captionClass}>How you know *</span>
                          <input
                            name="source"
                            required
                            defaultValue={status.source ?? ""}
                            className={inputClass}
                            placeholder="Saw the teudah, spoke to the rov, the agency's own list…"
                          />
                        </label>
                      </div>
                      <div className="mt-4">
                        <button
                          type="submit"
                          disabled={savePending || !storeReady}
                          className="min-h-[44px] border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
                        >
                          {savePending ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {saveState && (
          <p role="status" className={`mt-3 text-sm font-semibold ${saveState.ok ? "text-emerald-700" : "text-red-700"}`}>
            {saveState.message}
          </p>
        )}
      </section>

      <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          Recorded so far{confirmed.length > 0 ? ` · ${confirmed.length}` : ""}
        </h2>
        {confirmed.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">
            Nothing recorded yet. Every kosher place on the site reads <strong>Unverified</strong> until you mark it.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--gold-light)]">
            {confirmed.map((row) => (
              <li key={row.placeId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--navy)]">{row.placeName || row.placeId}</p>
                  {row.placeAddress && <p className="text-sm text-stone-500">{row.placeAddress}</p>}
                  {row.source && <p className="text-sm text-stone-500">How you know: {row.source}</p>}
                  <div className="mt-2">
                    <HechsherBadge status={row} size="sm" />
                  </div>
                </div>
                <form action={clearAction}>
                  <input type="hidden" name="placeId" value={row.placeId} />
                  <button
                    type="submit"
                    className="min-h-[36px] border border-[var(--gold-light)] px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500 transition hover:border-red-400 hover:text-red-700"
                  >
                    Back to unverified
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {clearState && (
          <p role="status" className={`mt-3 text-sm font-semibold ${clearState.ok ? "text-emerald-700" : "text-red-700"}`}>
            {clearState.message}
          </p>
        )}
      </section>
    </div>
  );
}
