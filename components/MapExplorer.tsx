"use client";

import { useMemo, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AreaMap, { type MapMarker } from "@/components/AreaMap";
import { geocodeOne } from "@/lib/geocode";
import { coordinatesToPoint } from "@/data/route-utils";

export type MapKever = {
  slug: string;
  name: string;
  city: string;
  country: string;
  coordinates: string;
  burials: number;
};

export type MapAirport = { code: string; name: string; city: string; lat: number; lng: number; size: string };

const RADII = [10, 25, 50, 100, 200];

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function MapExplorer({
  kevarim,
  airports,
  initialCenter,
  initialName,
}: {
  kevarim: MapKever[];
  airports: MapAirport[];
  initialCenter: { lat: number; lng: number };
  initialName: string;
}) {
  const [center, setCenter] = useState(initialCenter);
  const [name, setName] = useState(initialName);
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(50);
  const [status, setStatus] = useState("");

  async function search(value: string, coords?: string) {
    const label = value.trim();
    if (!label) return;
    setStatus("Finding that place…");

    // A place we already hold beats a geocoder lookup — our own coordinates for
    // a kever are the verified ones.
    const ours = kevarim.find((k) => `${k.city} ${k.name}`.toLowerCase().includes(label.toLowerCase()));
    const fromPicker = coords ? coordinatesToPoint(coords) : null;
    const point = fromPicker ?? (ours ? coordinatesToPoint(ours.coordinates) : null) ?? coordinatesToPoint((await geocodeOne(label))?.coordinates ?? "");

    if (!point) {
      setStatus(`Could not find “${label}”. Try a town name, or pick from the suggestions.`);
      return;
    }
    setCenter(point);
    setName(ours ? `${ours.city}` : label);
    setStatus("");
  }

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [
      { id: "center", name, lat: center.lat, lng: center.lng, kind: "center", subtitle: "What you searched for" },
    ];
    for (const k of kevarim) {
      const p = coordinatesToPoint(k.coordinates);
      if (!p) continue;
      const d = km(center, p);
      if (d > radius) continue;
      out.push({
        id: `kever-${k.slug}`,
        name: k.name,
        subtitle: `${k.city} · ${k.country} · ${k.burials} ${k.burials === 1 ? "kever" : "kevarim"}`,
        lat: p.lat,
        lng: p.lng,
        href: `/cemeteries/${k.slug}`,
        km: d,
        kind: "kever",
      });
    }
    for (const a of airports) {
      const d = km(center, { lat: a.lat, lng: a.lng });
      if (d > Math.max(radius, 120)) continue;
      out.push({
        id: `airport-${a.code}`,
        name: `${a.city} (${a.code})`,
        subtitle: `${a.name} · ${a.size === "major" ? "major hub" : "regional"}`,
        lat: a.lat,
        lng: a.lng,
        km: d,
        kind: "airport",
      });
    }
    return out;
  }, [center, name, kevarim, airports, radius]);

  const nearbyKevarim = markers.filter((m) => m.kind === "kever").sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-[1.6fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Search a town, kever or address</span>
          <AddressAutocomplete
            value={query}
            onChange={(value, coords) => {
              setQuery(value);
              if (coords) void search(value, coords);
            }}
            placeholder="e.g. Kraków"
            className="mt-1.5 w-full border border-[var(--gold-light)] px-3 py-3 text-base text-[var(--navy)] outline-none transition focus:border-[var(--gold)]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Within</span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-1.5 w-full border border-[var(--gold-light)] px-3 py-3 text-base text-[var(--navy)] outline-none"
          >
            {RADII.map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void search(query)}
          className="min-h-[50px] border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]"
        >
          Show me
        </button>
      </div>
      {status && <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{status}</p>}

      <div className="mt-6">
        <AreaMap center={center} centerName={name} markers={markers} radiusKm={Math.min(radius, 50)} height={520} />
      </div>

      <div className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
          {nearbyKevarim.length ? `${nearbyKevarim.length} ${nearbyKevarim.length === 1 ? "beis hachaim" : "batei hachaim"} within ${radius} km of ${name}` : `No batei hachaim within ${radius} km of ${name}`}
        </h2>
        {nearbyKevarim.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-stone-600">Widen the radius above, or search a different town.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {nearbyKevarim.map((m) => (
              <li key={m.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                <a href={m.href} className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                  {m.name}
                </a>
                <p className="mt-1 text-xs text-stone-500">{m.subtitle}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--gold)]">{m.km?.toFixed(1)} km away</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
