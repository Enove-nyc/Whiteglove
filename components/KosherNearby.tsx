"use client";

import { useEffect, useMemo, useState } from "react";
import { coordinatesToPoint, placeMapUrl } from "@/data/route-utils";
import type { ItinActivity } from "@/data/itinerary";
import { fetchKosherPlaces, type KosherPlace } from "@/lib/kosher-osm";
import HechsherBadge from "@/components/HechsherBadge";
import { hechsherOf, useHechsherim } from "@/lib/use-hechsherim";

const LS_KEY = "whiteGloveItinerary";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

function formatKm(km?: number) {
  if (km === undefined) return "";
  const mi = km * 0.621371;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km · ${Math.round(mi)} mi`;
}

// Save a kosher place into the traveler's itinerary (localStorage + account sync).
function addKosherToTrip(place: KosherPlace) {
  try {
    const saved = localStorage.getItem(LS_KEY);
    const itin = saved ? JSON.parse(saved) : { title: "My trip", startDate: "", endDate: "", flights: [], lodging: [], activities: [] };
    const activity: ItinActivity = {
      id: uid(),
      name: place.name,
      address: place.address,
      coordinates: `${place.lat}, ${place.lng}`,
      date: itin.startDate || "",
      notes: [place.category, place.cuisine].filter(Boolean).join(" · ") || "Kosher",
      bookedOnSite: false,
    };
    itin.activities = [...(itin.activities ?? []), activity];
    localStorage.setItem(LS_KEY, JSON.stringify(itin));
    void fetch("/api/account/itinerary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itinerary: itin }) }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export default function KosherNearby({
  coordinates,
  radiusKm = 8,
  limit = 12,
  autoLoad = false,
  showAddToTrip = false,
  heading = "Kosher food nearby",
}: {
  coordinates?: string;
  radiusKm?: number;
  limit?: number;
  autoLoad?: boolean;
  showAddToTrip?: boolean;
  heading?: string;
}) {
  const point = useMemo(() => coordinatesToPoint(coordinates), [coordinates]);
  const [places, setPlaces] = useState<KosherPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const shown = useMemo(() => (places ?? []).slice(0, limit), [places, limit]);
  const { statuses: confirmed, agencies } = useHechsherim(useMemo(() => shown.map((p) => p.id), [shown]));

  async function load() {
    if (!point) return;
    setLoading(true);
    const results = await fetchKosherPlaces(point, radiusKm);
    setPlaces(results);
    setLoading(false);
  }

  useEffect(() => {
    if (autoLoad && point) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, autoLoad]);

  if (!point) return null;

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{heading}</p>
        {places === null && !loading && (
          <button type="button" onClick={load} className="border border-[var(--gold)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Find kosher nearby</button>
        )}
        {loading && <span className="text-xs text-stone-500">Searching OpenStreetMap…</span>}
      </div>

      {places !== null && !loading && (
        places.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No kosher places are listed in OpenStreetMap within {radiusKm} km of here yet. Try a wider search on the <a href="/kosher" className="underline decoration-[var(--gold)] underline-offset-2">kosher finder</a>, or check the local kehilla.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--gold-light)]">
            {shown.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-[family-name:var(--font-display)] text-lg text-[var(--navy)]">{p.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--gold)]">{p.category}{p.km !== undefined ? ` · ${formatKm(p.km)}` : ""}</span>
                </div>
                {(p.cuisine || p.address) && <p className="mt-0.5 text-sm text-stone-600">{[p.cuisine, p.address].filter(Boolean).join(" — ")}</p>}
                <div className="mt-1.5">
                  <HechsherBadge status={hechsherOf(confirmed, p, agencies)} size="sm" agencies={agencies} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a href={placeMapUrl(p.address, `${p.lat}, ${p.lng}`)} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Open in Maps →</a>
                  {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">📞 {p.phone}</a>}
                  {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Website →</a>}
                  {showAddToTrip && (
                    <button type="button" onClick={() => { if (addKosherToTrip(p)) setAdded((a) => ({ ...a, [p.id]: true })); }} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                      {added[p.id] ? "Added ✓" : "Add to my trip"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
      {places !== null && places.length > 0 && (
        <p className="mt-3 text-[11px] leading-5 text-stone-400">
          Live from OpenStreetMap — community data. The circle is the hechsher: gold means we checked it against a teudah,
          the rov or the agency&apos;s own list. <strong>Unverified</strong> means nobody here has checked, whether or not a
          name is shown — ask to see the teudah before you eat. Hours and supervision change; confirm directly.
        </p>
      )}
    </div>
  );
}
