"use client";

import { useEffect, useRef, useState } from "react";

// Real-address autocomplete backed by Photon (OpenStreetMap) — free, no API
// key. As the user types, a dropdown of real addresses appears; picking one
// fills the address string and its coordinates. Runs entirely in the browser.

type Suggestion = { label: string; coordinates: string };

type PhotonFeature = {
  properties?: { name?: string; street?: string; housenumber?: string; city?: string; town?: string; village?: string; state?: string; country?: string; postcode?: string; type?: string; osm_key?: string };
  geometry?: { coordinates?: [number, number] };
};

const CITY_TYPES = new Set(["city", "town", "village", "municipality", "locality", "district", "region", "state", "county", "country"]);

function toSuggestion(feature: PhotonFeature, mode: "address" | "city"): Suggestion | null {
  const p = feature.properties ?? {};
  const coords = feature.geometry?.coordinates;
  const coordinates = coords ? `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}` : "";

  if (mode === "city") {
    // Only real places (cities/towns), not streets or house numbers.
    const isPlace = p.osm_key === "place" || (p.type ? CITY_TYPES.has(p.type) : false);
    if (!isPlace || !p.name) return null;
    const label = [p.name, p.state, p.country].filter(Boolean).join(", ");
    return { label, coordinates };
  }

  const main = p.name || [p.housenumber, p.street].filter(Boolean).join(" ");
  const parts = [main, p.city || p.town || p.village, p.state, p.country].filter(Boolean);
  const label = parts.join(", ");
  if (!label) return null;
  return { label, coordinates };
}

export default function AddressAutocomplete({
  value = "",
  onChange,
  placeholder,
  className,
  name,
  mode = "address",
  required = false,
}: {
  value?: string;
  onChange?: (address: string, coordinates?: string) => void;
  placeholder?: string;
  className?: string;
  name?: string; // when used inside a plain <form> (server action), submits by this name
  mode?: "address" | "city";
  /** Passed straight to the input, so a starred label is actually enforced. */
  required?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sync when the value is set from outside (e.g. prefilled by the kever picker).
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const layer = mode === "city" ? "&layer=city&layer=district&layer=locality&layer=county&layer=state" : "";
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8${layer}`);
        const data = (await res.json()) as { features?: PhotonFeature[] };
        if (!active) return;
        const mapped = (data.features ?? []).map((f) => toSuggestion(f, mode)).filter((s): s is Suggestion => s !== null);
        // De-duplicate identical labels (Photon can repeat).
        const seen = new Set<string>();
        setResults(mapped.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true))).slice(0, 6));
      } catch {
        if (active) setResults([]);
      }
    }, 280);
    return () => { active = false; clearTimeout(timer); };
  }, [query, mode]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        name={name}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange?.(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Start typing an address…"}
        autoComplete="off"
        required={required}
        className={className}
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 max-h-64 overflow-auto border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_16px_36px_rgba(23,45,82,.14)]">
          {results.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setQuery(s.label); onChange?.(s.label, s.coordinates); setOpen(false); setResults([]); }}
                className="block w-full px-3 py-2 text-left text-sm font-normal normal-case tracking-normal text-stone-700 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
