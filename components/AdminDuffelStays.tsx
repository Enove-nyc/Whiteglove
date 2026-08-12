"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useRef, useState } from "react";
import { DUFFEL_DASHBOARD } from "@/lib/duffel-api";
import type { StayPlaceMatch, StaySearchResult } from "@/lib/duffel-stays";

type SearchState = {
  message: string;
  detail?: string;
  hotels?: StaySearchResult[];
  places?: StayPlaceMatch[];
};

const money = (amount: string, currency: string) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || !currency) return amount || "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
};

const maskDate = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
};
const toIsoDate = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, month, day, year] = match;
  const parsed = new Date(`${year}-${month}-${day}T12:00:00`);
  return Number.isNaN(parsed.getTime()) || parsed.getMonth() + 1 !== Number(month) || parsed.getDate() !== Number(day)
    ? ""
    : `${year}-${month}-${day}`;
};
const fromIsoDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${month}/${day}/${year}` : "";
};

function placeLabel(place: StayPlaceMatch): string {
  return place.country ? `${place.name}, ${place.country}` : place.name;
}

/**
 * Admin Duffel Stays search. City or place is geocoded, then POST /stays/search
 * runs on the server. There is no stay checkout here — book from Duffel's
 * dashboard if Stays is enabled on the account.
 */
export default function AdminDuffelStays() {
  const [destination, setDestination] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [rooms, setRooms] = useState("1");
  const [guests, setGuests] = useState("2");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<SearchState | null>(null);

  function choosePlace(place: StayPlaceMatch) {
    const label = placeLabel(place);
    setDestination(label);
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    void runSearch({ destination: label, latitude: place.latitude, longitude: place.longitude });
  }

  async function runSearch(override?: { destination: string; latitude: number; longitude: number }) {
    const checkInDate = toIsoDate(checkIn);
    const checkOutDate = toIsoDate(checkOut);
    if (!checkInDate || !checkOutDate) {
      setState({ message: "Enter check-in and check-out as MM/DD/YYYY." });
      return;
    }

    const place = (override?.destination ?? destination).trim();
    const lat = override?.latitude ?? latitude;
    const lng = override?.longitude ?? longitude;
    if (!place && (lat === null || lng === null)) {
      setState({ message: "Type a city or place, then search." });
      return;
    }

    setLoading(true);
    setState(null);
    try {
      const response = await fetch("/api/hotels/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: place,
          ...(lat !== null && lng !== null ? { latitude: lat, longitude: lng } : {}),
          checkInDate,
          checkOutDate,
          rooms,
          guests,
        }),
      });
      const result = (await response.json()) as SearchState;
      setState(result);
    } catch {
      setState({ message: "The stay search could not be reached. Try again." });
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch();
  }

  function onDestinationChange(value: string) {
    setDestination(value);
    setLatitude(null);
    setLongitude(null);
  }

  return (
    <div>
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] sm:col-span-2">
          City or place
          <input
            value={destination}
            onChange={(event) => onDestinationChange(event.target.value)}
            placeholder="City, town, or lat, lng"
            required
            autoComplete="off"
            className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 text-base font-normal normal-case tracking-normal text-stone-700 outline-none transition focus:border-[var(--gold)]"
          />
        </label>
        <StayDateField label="Check in" value={checkIn} onChange={setCheckIn} required />
        <StayDateField label="Check out" value={checkOut} onChange={setCheckOut} required />
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
          Rooms
          <input
            value={rooms}
            onChange={(event) => setRooms(event.target.value)}
            inputMode="numeric"
            required
            className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 text-base font-normal normal-case tracking-normal text-stone-700 outline-none transition focus:border-[var(--gold)]"
          />
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
          Guests
          <input
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
            inputMode="numeric"
            required
            className="mt-2 w-full border border-[var(--gold-light)] bg-white px-4 py-3 text-base font-normal normal-case tracking-normal text-stone-700 outline-none transition focus:border-[var(--gold)]"
          />
        </label>
        <button
          disabled={loading}
          className="bg-[var(--navy)] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--gold)] disabled:cursor-wait disabled:opacity-70 sm:col-span-2"
        >
          {loading ? "Searching..." : "Search stays"}
        </button>
      </form>

      {state ? (
        <div className="mt-6">
          <div className="border-l-2 border-[var(--gold)] bg-[var(--cream)] p-4 text-sm leading-6 text-stone-700">
            <p>{state.message}</p>
            {state.detail ? <p className="mt-2 text-stone-500">{state.detail}</p> : null}
          </div>

          {state.places?.length ? (
            <div className="mt-4 border border-[var(--gold-light)] bg-white">
              {state.places.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => choosePlace(place)}
                  className="block w-full border-b border-[var(--gold-light)] px-4 py-3 text-left text-sm text-stone-700 last:border-b-0 hover:bg-[var(--cream-deep)] hover:text-[var(--navy)]"
                >
                  {placeLabel(place)}
                </button>
              ))}
            </div>
          ) : null}

          {state.hotels?.length ? (
            <div className="mt-5 grid gap-3">
              <p className="text-sm leading-6 text-stone-600">
                Room and rate lists on this search can be incomplete. The amount shown is Duffel&rsquo;s cheapest total
                for the stay. There is no stay checkout on this site — continue in the{" "}
                <a
                  href={DUFFEL_DASHBOARD}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                >
                  Duffel dashboard
                </a>
                .
              </p>
              {state.hotels.map((hotel) => (
                <article key={hotel.id} className="flex gap-4 border border-[var(--gold-light)] bg-white p-4">
                  {hotel.photo ? (
                    <img src={hotel.photo} alt="" className="h-24 w-28 shrink-0 object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--navy)]">{hotel.name}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          {hotel.address || hotel.city || "Address not returned"}
                          {hotel.rating ? ` · ${hotel.rating} stars` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                        {hotel.totalAmount ? money(hotel.totalAmount, hotel.totalCurrency) : "—"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StayDateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
      {label}
      <span className="mt-2 flex border border-[var(--gold-light)] bg-white">
        <input
          value={value}
          onChange={(event) => onChange(maskDate(event.target.value))}
          onFocus={(event) => event.currentTarget.select()}
          placeholder="MM/DD/YYYY"
          inputMode="numeric"
          required={required}
          className="min-w-0 flex-1 px-4 py-3 text-base font-normal normal-case tracking-normal text-stone-700 outline-none"
        />
        <button
          type="button"
          onClick={() => picker.current?.showPicker()}
          className="border-l border-[var(--gold-light)] px-3 text-[var(--navy)]"
          aria-label={`Choose ${label} from calendar`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M7 3v4M17 3v4M3 10h18" />
          </svg>
        </button>
        <input
          ref={picker}
          type="date"
          value={toIsoDate(value)}
          onChange={(event) => onChange(fromIsoDate(event.target.value))}
          className="absolute h-px w-px opacity-0"
          tabIndex={-1}
        />
      </span>
    </label>
  );
}
