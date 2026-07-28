"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import KosherNearby from "@/components/KosherNearby";

const RADII = [3, 8, 15, 30];

// Full kosher finder: pick a city (real coordinates from OpenStreetMap via
// Photon), choose a radius, and see live kosher places from OpenStreetMap.
export default function KosherFinder({ showAddToTrip = true }: { showAddToTrip?: boolean }) {
  const [coords, setCoords] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [radius, setRadius] = useState(8);

  return (
    <div>
      <div className="wg-card border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">City or place</span>
          <AddressAutocomplete
            mode="city"
            value={label}
            onChange={(city, c) => { setLabel(city); if (c) setCoords(c); }}
            placeholder="Type a city — e.g. London, Antwerp, Jerusalem, Brooklyn…"
            className="mt-1 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2 text-sm text-[var(--navy)] shadow-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Within</span>
          {RADII.map((r) => (
            <button key={r} type="button" onClick={() => setRadius(r)} className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] transition ${radius === r ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}>{r} km</button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {coords ? (
          <KosherNearby key={`${coords}-${radius}`} coordinates={coords} radiusKm={radius} autoLoad limit={40} showAddToTrip={showAddToTrip} heading={label ? `Kosher near ${label}` : "Kosher nearby"} />
        ) : (
          <p className="border border-dashed border-[var(--gold-light)] p-8 text-center text-sm text-stone-500">Pick a city above to see kosher restaurants, bakeries, and groceries listed in OpenStreetMap nearby.</p>
        )}
      </div>
    </div>
  );
}
