"use client";

import { useEffect, useRef, useState } from "react";
import { AIRPORTS } from "@/data/airports";
import { metroMatches } from "@/lib/flight-endpoint";

// Airport picker for flight search. The dropdown only appears once the traveler
// types, sits directly under the box, and matches by city too — so "NYC" or
// "New York" surfaces every New York airport (JFK, EWR, LGA).
//
// A city served by several airports is offered FIRST, as one option covering
// all of them. That is nearly always the question being asked: somebody flying
// to London does not usually mind which of the five they land at, and picking
// Heathrow off the list hides whatever Gatwick was charging. The individual
// airports stay underneath for when it does matter.
export default function AirportAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Passed straight to the input, so a starred label is actually enforced. */
  required?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Sync when the value is set from outside (e.g. after a flight-number lookup).
  useEffect(() => { setQuery(value); }, [value]);

  const q = query.trim().toLowerCase();
  const cities = q.length >= 1 ? metroMatches(q) : [];
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
        required={required}
        className={className}
      />
      {open && (cities.length > 0 || matches.length > 0) && (
        <ul className="absolute left-0 right-0 top-full z-30 max-h-72 overflow-auto border border-[var(--gold)] bg-[#fcfaf6] shadow-[0_16px_36px_rgba(23,45,82,.14)]">
          {cities.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                // Written back WITH the code, the same shape as an airport
                // pick, so the value in the box says plainly what will be
                // searched and reads back as the same place.
                onMouseDown={(e) => { e.preventDefault(); const label = `${c.label} (${c.code})`; setQuery(label); onChange(label); setOpen(false); }}
                className="block w-full border-b border-[var(--gold-light)] bg-[var(--cream)] px-3 py-2 text-left text-sm font-normal normal-case tracking-normal text-stone-700 transition hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
              >
                {c.label} <strong className="text-[var(--navy)]">({c.code})</strong>
                <span className="block text-xs text-stone-500">Searches {c.airports.join(", ")} together</span>
              </button>
            </li>
          ))}
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
