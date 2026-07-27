"use client";

import { useEffect, useRef, useState } from "react";

// Real-address autocomplete backed by Photon (OpenStreetMap) — free, no API
// key. As the user types, a dropdown of real addresses appears; picking one
// fills the address string and its coordinates. Runs entirely in the browser.

type Suggestion = { label: string; coordinates: string };

type PhotonFeature = {
  properties?: { name?: string; street?: string; housenumber?: string; city?: string; town?: string; village?: string; state?: string; country?: string; postcode?: string };
  geometry?: { coordinates?: [number, number] };
};

function toSuggestion(feature: PhotonFeature): Suggestion | null {
  const p = feature.properties ?? {};
  const coords = feature.geometry?.coordinates;
  const main = p.name || [p.housenumber, p.street].filter(Boolean).join(" ");
  const parts = [main, p.city || p.town || p.village, p.state, p.country].filter(Boolean);
  const label = parts.join(", ");
  if (!label) return null;
  const coordinates = coords ? `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}` : "";
  return { label, coordinates };
}

export default function AddressAutocomplete({
  value = "",
  onChange,
  placeholder,
  className,
  name,
}: {
  value?: string;
  onChange?: (address: string, coordinates?: string) => void;
  placeholder?: string;
  className?: string;
  name?: string; // when used inside a plain <form> (server action), submits by this name
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`);
        const data = (await res.json()) as { features?: PhotonFeature[] };
        if (!active) return;
        setResults((data.features ?? []).map(toSuggestion).filter((s): s is Suggestion => s !== null));
      } catch {
        if (active) setResults([]);
      }
    }, 280);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

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
        className={className}
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 max-h-64 overflow-auto border border-[var(--gold-light)] bg-white shadow-lg">
          {results.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setQuery(s.label); onChange?.(s.label, s.coordinates); setOpen(false); setResults([]); }}
                className="block w-full px-3 py-2 text-left text-sm font-normal normal-case tracking-normal text-stone-700 hover:bg-[var(--cream)]"
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
