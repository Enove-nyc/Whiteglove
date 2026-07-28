"use client";

import { useEffect, useRef, useState } from "react";
import { AIRPORTS } from "@/data/airports";

// Airport picker for flight search. The dropdown only appears once the traveler
// types, sits directly under the box, and matches by city too — so "NYC" or
// "New York" surfaces every New York airport (JFK, EWR, LGA).
export default function AirportAutocomplete({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sync when the value is set from outside (e.g. after a flight-number lookup).
  useEffect(() => { setQuery(value); }, [value]);

  const q = query.trim().toLowerCase();
  const matches = q.length >= 1
    ? AIRPORTS.filter((a) => `${a.code} ${a.name} ${a.city} ${a.country} ${a.aliases.join(" ")}`.toLowerCase().includes(q)).slice(0, 8)
    : [];

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "City or airport"}
        autoComplete="off"
        className={className}
      />
      {open && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_16px_36px_rgba(23,45,82,.14)]">
          {matches.map((a) => (
            <li key={a.code}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); const label = `${a.city} (${a.code})`; setQuery(label); onChange(label); setOpen(false); }}
                className="block w-full px-3 py-2 text-left text-sm font-normal normal-case tracking-normal text-stone-700 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
              >
                {a.city} — {a.name} <strong className="text-[var(--navy)]">({a.code})</strong>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
