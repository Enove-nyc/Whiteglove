"use client";

import { useState } from "react";

// Unified "Book" experience. Each tab collects a search and hands the traveler
// off to a trusted partner that takes payment (affiliate-ready deep links).
// No payment or PII is handled on White Glove.

type Tab = "flights" | "hotels" | "cars";

const inputClass =
  "mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-base text-stone-700 outline-none transition focus:border-[var(--gold)]";
const caption = "text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]";

// A short list of common airports so travelers can pick a code for flights.
const AIRPORTS = [
  "New York (JFK)", "Newark (EWR)", "Boston (BOS)", "Miami (MIA)", "Los Angeles (LAX)",
  "Toronto (YYZ)", "London (LHR)", "Paris (CDG)", "Krakow (KRK)", "Rzeszow (RZE)",
  "Warsaw (WAW)", "Budapest (BUD)", "Vienna (VIE)", "Prague (PRG)", "Frankfurt (FRA)",
  "Munich (MUC)", "Rome (FCO)", "Zurich (ZRH)", "Tel Aviv (TLV)", "Istanbul (IST)",
];

// Extract a 3-letter airport code from free text like "New York (JFK)" or "jfk".
function airportCode(value: string): string {
  const upper = value.toUpperCase();
  const inParens = upper.match(/\(([A-Z]{3})\)/);
  if (inParens) return inParens[1];
  const bare = upper.match(/\b([A-Z]{3})\b/);
  return bare ? bare[1] : "";
}

function openPartner(url: string) {
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

export default function BookPartners() {
  const [tab, setTab] = useState<Tab>("flights");
  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 shadow-[0_20px_50px_rgba(29,47,111,.08)] sm:p-8">
      <div className="flex border-b border-[var(--gold-light)]">
        <TabButton active={tab === "flights"} onClick={() => setTab("flights")}>Flights</TabButton>
        <TabButton active={tab === "hotels"} onClick={() => setTab("hotels")}>Hotels</TabButton>
        <TabButton active={tab === "cars"} onClick={() => setTab("cars")}>Cars</TabButton>
      </div>

      <datalist id="wg-airports">{AIRPORTS.map((a) => <option key={a} value={a} />)}</datalist>

      {tab === "flights" && <FlightsForm />}
      {tab === "hotels" && <HotelsForm />}
      {tab === "cars" && <CarsForm />}

      <p className="mt-6 border-t border-[var(--gold-light)] pt-4 text-xs leading-6 text-stone-500">
        Searches open with a trusted partner (Kayak, Booking.com) where you compare and pay securely. White Glove keeps the rest of your journey — kevarim, shomer details, and guidance — together in one place.
      </p>
    </div>
  );
}

function FlightsForm() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [oneWay, setOneWay] = useState(false);
  const [error, setError] = useState("");

  function search() {
    const o = airportCode(from);
    const d = airportCode(to);
    if (!o || !d) { setError("Enter airport codes (e.g. JFK, KRK) for both cities."); return; }
    if (!depart) { setError("Choose a departure date."); return; }
    if (!oneWay && ret && ret < depart) { setError("Return must be after departure."); return; }
    setError("");
    const url = `https://www.kayak.com/flights/${o}-${d}/${depart}${!oneWay && ret ? `/${ret}` : ""}?sort=bestflight_a`;
    openPartner(url);
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className={`block ${caption}`}>From (airport)
        <input list="wg-airports" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="New York (JFK)" className={inputClass} />
      </label>
      <label className={`block ${caption}`}>To (airport)
        <input list="wg-airports" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Krakow (KRK)" className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Departure
        <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Return
        <input type="date" value={ret} disabled={oneWay} onChange={(e) => setRet(e.target.value)} className={`${inputClass} disabled:opacity-50`} />
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold text-[var(--navy)] sm:col-span-2">
        <input type="checkbox" checked={oneWay} onChange={(e) => setOneWay(e.target.checked)} className="h-4 w-4 accent-[var(--navy)]" />
        One way
      </label>
      {error && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      <button type="button" onClick={search} className="bg-[var(--navy)] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--gold)] sm:col-span-2">Search flights on Kayak →</button>
    </div>
  );
}

function HotelsForm() {
  const [dest, setDest] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("2");
  const [error, setError] = useState("");

  function search() {
    if (!dest.trim()) { setError("Enter a city or destination."); return; }
    if (!checkin || !checkout) { setError("Choose check-in and check-out dates."); return; }
    if (checkout <= checkin) { setError("Check-out must be after check-in."); return; }
    setError("");
    const url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.trim())}&checkin=${checkin}&checkout=${checkout}&group_adults=${Math.max(1, Number(guests) || 1)}`;
    openPartner(url);
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className={`block ${caption} sm:col-span-2`}>Destination (city)
        <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Krakow, Poland" className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Check in
        <input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Check out
        <input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Guests
        <input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className={inputClass} />
      </label>
      {error && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      <button type="button" onClick={search} className="bg-[var(--navy)] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--gold)] sm:col-span-2">Search hotels on Booking.com →</button>
    </div>
  );
}

function CarsForm() {
  const [loc, setLoc] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");

  function search() {
    if (!loc.trim()) { setError("Enter a pick-up city or airport."); return; }
    if (!pickup || !dropoff) { setError("Choose pick-up and drop-off dates."); return; }
    if (dropoff < pickup) { setError("Drop-off must be on or after pick-up."); return; }
    setError("");
    const url = `https://www.kayak.com/cars/${encodeURIComponent(loc.trim())}/${pickup}/${dropoff}`;
    openPartner(url);
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className={`block ${caption} sm:col-span-2`}>Pick-up location (city or airport)
        <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Krakow Airport" className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Pick-up date
        <input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} className={inputClass} />
      </label>
      <label className={`block ${caption}`}>Drop-off date
        <input type="date" value={dropoff} onChange={(e) => setDropoff(e.target.value)} className={inputClass} />
      </label>
      {error && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      <button type="button" onClick={search} className="bg-[var(--navy)] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--gold)] sm:col-span-2">Search cars on Kayak →</button>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] ${active ? "border-b-2 border-[var(--gold)] text-[var(--navy)]" : "text-stone-500"}`}>
      {children}
    </button>
  );
}
