"use client";

import { useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { emptyItinerary, nextDate, type ItinActivity, type ItinFlight, type ItinLodging, type Itinerary } from "@/data/itinerary";

// Unified "Book" experience. Each tab collects a search and hands the traveler
// off to a trusted partner that takes payment (affiliate-ready deep links).
// A traveler can also save the item to their itinerary before booking, so it
// comes back to their account.

type Tab = "flights" | "hotels" | "cars" | "points";
export type Affiliate = { bookingAid?: string; kayakParams?: string; travelpayoutsMarker?: string };

const inputClass = "mt-2 w-full border border-[var(--gold-light)] bg-white px-3 py-3 text-base text-stone-700 outline-none transition focus:border-[var(--gold)]";
const caption = "text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]";
const LS_KEY = "whiteGloveItinerary";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

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

function withKayakAffiliate(url: string, params?: string) {
  if (!params) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${params.replace(/^[?&]/, "")}`;
}

export default function BookPartners({ affiliate }: { affiliate?: Affiliate }) {
  const [tab, setTab] = useState<Tab>("flights");
  const [added, setAdded] = useState(false);

  // Save items into the traveler's itinerary (localStorage + account sync).
  function addToTrip(patch: { flights?: ItinFlight[]; lodging?: ItinLodging[]; activities?: ItinActivity[]; dates?: string[] }) {
    let itin: Itinerary = emptyItinerary();
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) itin = { ...emptyItinerary(), ...JSON.parse(saved) };
    } catch {
      /* start fresh */
    }
    const next: Itinerary = {
      ...itin,
      flights: [...(itin.flights ?? []), ...(patch.flights ?? [])],
      lodging: [...(itin.lodging ?? []), ...(patch.lodging ?? [])],
      activities: [...(itin.activities ?? []), ...(patch.activities ?? [])],
    };
    const dates = (patch.dates ?? []).filter(Boolean).sort();
    if (dates.length) {
      if (!next.startDate || dates[0] < next.startDate) next.startDate = dates[0];
      if (!next.endDate || dates[dates.length - 1] > next.endDate) next.endDate = dates[dates.length - 1];
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    void fetch("/api/account/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itinerary: next }),
    }).catch(() => undefined);
    setAdded(true);
  }

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 shadow-[0_20px_50px_rgba(29,47,111,.08)] sm:p-8">
      <div className="flex border-b border-[var(--gold-light)]">
        <TabButton active={tab === "flights"} onClick={() => setTab("flights")}>Flights</TabButton>
        <TabButton active={tab === "hotels"} onClick={() => setTab("hotels")}>Hotels</TabButton>
        <TabButton active={tab === "cars"} onClick={() => setTab("cars")}>Cars</TabButton>
        <TabButton active={tab === "points"} onClick={() => setTab("points")}>Pay with points</TabButton>
      </div>

      {added && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-[var(--gold)] bg-[var(--cream)] p-4 text-sm">
          <span className="font-semibold text-[var(--navy)]">✓ Added to your trip.</span>
          <a href="/itinerary" className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)]">Open my itinerary planner →</a>
        </div>
      )}

      {tab === "flights" && <FlightsForm affiliate={affiliate} onAdd={addToTrip} />}
      {tab === "hotels" && <HotelsForm affiliate={affiliate} onAdd={addToTrip} />}
      {tab === "cars" && <CarsForm onAdd={addToTrip} />}
      {tab === "points" && <PointsForm />}

      <p className="mt-6 border-t border-[var(--gold-light)] pt-4 text-xs leading-6 text-stone-500">
        Searches open with a trusted partner (Kayak, Booking.com) where you compare and pay securely. Save an item to your trip to keep it in your White Glove itinerary.
      </p>
    </div>
  );
}

type AddFn = (patch: { flights?: ItinFlight[]; lodging?: ItinLodging[]; activities?: ItinActivity[]; dates?: string[] }) => void;

function FlightsForm({ affiliate, onAdd }: { affiliate?: Affiliate; onAdd: AddFn }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState("");
  const [ret, setRet] = useState("");
  const [oneWay, setOneWay] = useState(false);
  const [error, setError] = useState("");

  function validate() {
    const o = airportCode(from);
    const d = airportCode(to);
    if (!o || !d) { setError("Enter airport codes (e.g. JFK, KRK) for both cities."); return null; }
    if (!depart) { setError("Choose a departure date."); return null; }
    if (!oneWay && ret && ret < depart) { setError("Return must be after departure."); return null; }
    setError("");
    return { o, d };
  }

  function search() {
    const v = validate();
    if (!v) return;
    const url = withKayakAffiliate(`https://www.kayak.com/flights/${v.o}-${v.d}/${depart}${!oneWay && ret ? `/${ret}` : ""}?sort=bestflight_a`, affiliate?.kayakParams);
    openPartner(url);
  }

  function addToTrip() {
    const v = validate();
    if (!v) return;
    const flights: ItinFlight[] = [{ id: uid(), from: v.o, to: v.d, date: depart, bookedOnSite: false }];
    if (!oneWay && ret) flights.push({ id: uid(), from: v.d, to: v.o, date: ret, bookedOnSite: false });
    onAdd({ flights, dates: [depart, ret] });
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className={`block ${caption}`}>From (city or airport)<AirportAutocomplete value={from} onChange={setFrom} placeholder="e.g. NYC or New York" className={inputClass} /></label>
      <label className={`block ${caption}`}>To (city or airport)<AirportAutocomplete value={to} onChange={setTo} placeholder="e.g. Krakow" className={inputClass} /></label>
      <label className={`block ${caption}`}>Departure<input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={inputClass} /></label>
      <label className={`block ${caption}`}>Return<input type="date" value={ret} disabled={oneWay} onChange={(e) => setRet(e.target.value)} className={`${inputClass} disabled:opacity-50`} /></label>
      <label className="flex items-center gap-2 text-xs font-semibold text-[var(--navy)] sm:col-span-2"><input type="checkbox" checked={oneWay} onChange={(e) => setOneWay(e.target.checked)} className="h-4 w-4 accent-[var(--navy)]" />One way</label>
      {error && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      <ActionRow onSearch={search} onAdd={addToTrip} searchLabel="Search flights on Kayak →" />
    </div>
  );
}

function HotelsForm({ affiliate, onAdd }: { affiliate?: Affiliate; onAdd: AddFn }) {
  const [dest, setDest] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState("2");
  const [error, setError] = useState("");

  function validate() {
    if (!dest.trim()) { setError("Enter a city or destination."); return false; }
    if (!checkin || !checkout) { setError("Choose check-in and check-out dates."); return false; }
    if (checkout <= checkin) { setError("Check-out must be after check-in."); return false; }
    setError("");
    return true;
  }

  function search() {
    if (!validate()) return;
    let url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest.trim())}&checkin=${checkin}&checkout=${checkout}&group_adults=${Math.max(1, Number(guests) || 1)}`;
    if (affiliate?.bookingAid) url += `&aid=${encodeURIComponent(affiliate.bookingAid)}&label=whiteglove`;
    openPartner(url);
  }

  function addToTrip() {
    if (!validate()) return;
    const lodging: ItinLodging[] = [{ id: uid(), type: "hotel", name: `Hotel in ${dest.trim()}`, address: dest.trim(), checkIn: checkin, checkOut: checkout, bookedOnSite: false }];
    onAdd({ lodging, dates: [checkin, checkout] });
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className={`block ${caption} sm:col-span-2`}>Destination (city)<AddressAutocomplete mode="city" value={dest} onChange={(city) => setDest(city)} placeholder="Start typing a city…" className={inputClass} /></label>
      <label className={`block ${caption}`}>Check in<input type="date" value={checkin} onChange={(e) => { const v = e.target.value; setCheckin(v); if (checkout && v && checkout <= v) setCheckout(nextDate(v)); }} className={inputClass} /></label>
      <label className={`block ${caption}`}>Check out<input type="date" value={checkout} min={checkin ? nextDate(checkin) : undefined} onChange={(e) => setCheckout(e.target.value)} className={inputClass} /></label>
      <label className={`block ${caption}`}>Guests<input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className={inputClass} /></label>
      {error && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      <ActionRow onSearch={search} onAdd={addToTrip} searchLabel="Search hotels on Booking.com →" />
    </div>
  );
}

function CarsForm({ onAdd }: { onAdd: AddFn }) {
  const [loc, setLoc] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");

  function validate() {
    if (!loc.trim()) { setError("Enter a pick-up city or airport."); return false; }
    if (!pickup || !dropoff) { setError("Choose pick-up and drop-off dates."); return false; }
    if (dropoff < pickup) { setError("Drop-off must be on or after pick-up."); return false; }
    setError("");
    return true;
  }

  function search() {
    if (!validate()) return;
    openPartner(`https://www.kayak.com/cars/${encodeURIComponent(loc.trim())}/${pickup}/${dropoff}`);
  }

  function addToTrip() {
    if (!validate()) return;
    const activities: ItinActivity[] = [{ id: uid(), name: `Rental car — ${loc.trim()}`, date: pickup, notes: `Drop-off ${dropoff}`, bookedOnSite: false }];
    onAdd({ activities, dates: [pickup, dropoff] });
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2">
      <label className={`block ${caption} sm:col-span-2`}>Pick-up location (city)<AddressAutocomplete mode="city" value={loc} onChange={(city) => setLoc(city)} placeholder="Start typing a city…" className={inputClass} /></label>
      <label className={`block ${caption}`}>Pick-up date<input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} className={inputClass} /></label>
      <label className={`block ${caption}`}>Drop-off date<input type="date" value={dropoff} onChange={(e) => setDropoff(e.target.value)} className={inputClass} /></label>
      {error && <p className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
      <ActionRow onSearch={search} onAdd={addToTrip} searchLabel="Search cars on Kayak →" />
    </div>
  );
}

function ActionRow({ onSearch, onAdd, searchLabel }: { onSearch: () => void; onAdd: () => void; searchLabel: string }) {
  return (
    <div className="flex flex-wrap gap-3 sm:col-span-2">
      <button type="button" onClick={onSearch} className="flex-1 bg-[var(--navy)] px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--gold)]">{searchLabel}</button>
      <button type="button" onClick={onAdd} className="border border-[var(--gold)] px-6 py-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">+ Add to my trip</button>
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

// ---- Pay with points -------------------------------------------------
// Award seats can only be redeemed inside your own loyalty account — no site
// can book them for you. So this does the two things that actually help:
// works out whether a redemption is good value, and hands off to the free
// award-search tools and the program's own award page.

const POINTS_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Choose the program you have points with…", award: "" },
  { label: "Amex Membership Rewards", award: "https://www.americanexpress.com/en-us/travel/" },
  { label: "Chase Ultimate Rewards", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Miles", award: "https://travel.capitalone.com/" },
  { label: "United MileagePlus", award: "https://www.united.com/en/us/book-flight/united-award-travel" },
  { label: "Delta SkyMiles", award: "https://www.delta.com/" },
  { label: "American AAdvantage", award: "https://www.aa.com/" },
  { label: "Air Canada Aeroplan", award: "https://www.aircanada.com/aeroplan" },
  { label: "Flying Blue (Air France/KLM)", award: "https://wwws.airfrance.us/flying-blue" },
  { label: "El Al Matmid", award: "https://www.elal.com/" },
  { label: "Marriott Bonvoy", award: "https://www.marriott.com/" },
  { label: "Hilton Honors", award: "https://www.hilton.com/" },
  { label: "World of Hyatt", award: "https://www.hyatt.com/" },
];

function PointsForm() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const [program, setProgram] = useState("");
  const [miles, setMiles] = useState("");
  const [cash, setCash] = useState("");
  const [taxes, setTaxes] = useState("");

  const milesNum = Number(miles.replace(/[^\d.]/g, ""));
  const cashNum = Number(cash.replace(/[^\d.]/g, ""));
  const taxNum = Number(taxes.replace(/[^\d.]/g, "")) || 0;
  // Cents per point = (what the cash ticket costs, minus what you still pay in
  // taxes) divided by the points it takes. The standard way to judge a redemption.
  const cpp = milesNum > 0 && cashNum > 0 ? ((cashNum - taxNum) / milesNum) * 100 : null;
  const verdict =
    cpp === null ? null : cpp >= 2 ? { text: "Strong value — worth redeeming.", tone: "text-emerald-700" }
    : cpp >= 1.2 ? { text: "Reasonable value.", tone: "text-[var(--navy)]" }
    : { text: "Weak value — paying cash is probably better.", tone: "text-amber-800" };

  const route = [from.trim(), to.trim()].filter(Boolean).join(" to ");
  const selected = POINTS_PROGRAMS.find((p) => p.label === program);

  return (
    <div className="mt-7">
      <div className="border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-3 text-sm leading-6 text-stone-700">
        <strong className="text-[var(--navy)]">How booking with points works.</strong> No website can redeem your points for you —
        award seats come out of your own loyalty account, so the booking is always finished on the airline or hotel&apos;s own site.
        What we do here is help you find the seats and check the redemption is worth it.
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className={`block ${caption} sm:col-span-2`}>Which points do you have?
          <select value={program} onChange={(e) => setProgram(e.target.value)} className={inputClass}>
            {POINTS_PROGRAMS.map((p) => <option key={p.label} value={p.label === POINTS_PROGRAMS[0].label ? "" : p.label}>{p.label}</option>)}
          </select>
        </label>
        <label className={`block ${caption}`}>From<AirportAutocomplete value={from} onChange={setFrom} placeholder="City or airport" className={inputClass} /></label>
        <label className={`block ${caption}`}>To<AirportAutocomplete value={to} onChange={setTo} placeholder="City or airport" className={inputClass} /></label>
        <label className={`block ${caption}`}>When<input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass} /></label>
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">1 · Find award seats (free tools)</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <a href={`https://www.pointsyeah.com/search${route ? `?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}` : ""}`} target="_blank" rel="noreferrer" className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">Search award seats on PointsYeah →</a>
        <a href="https://seats.aero/search" target="_blank" rel="noreferrer" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Search on seats.aero →</a>
        {selected?.award && <a href={selected.award} target="_blank" rel="noreferrer" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Open {program} →</a>}
      </div>
      <p className="mt-2 text-xs text-stone-500">Independent award-search sites, free to use. We don&apos;t see your balances or your account.</p>

      <p className="mt-8 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">2 · Is it worth using your points?</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <label className={`block ${caption}`}>Points required<input inputMode="numeric" value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="45000" className={inputClass} /></label>
        <label className={`block ${caption}`}>Cash price of the same ticket<input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="900" className={inputClass} /></label>
        <label className={`block ${caption}`}>Taxes/fees you still pay<input inputMode="decimal" value={taxes} onChange={(e) => setTaxes(e.target.value)} placeholder="90" className={inputClass} /></label>
      </div>
      {cpp !== null && verdict && (
        <div className="mt-4 border border-[var(--gold-light)] bg-white p-4">
          <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{cpp.toFixed(2)}¢ <span className="text-lg text-stone-500">per point</span></p>
          <p className={`mt-1 text-sm font-semibold ${verdict.tone}`}>{verdict.text}</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Worked out as (cash price − taxes you still pay) ÷ points. Around 1.2¢ is typical; 2¢ or more is usually a good redemption.
            Compare against what your own program normally returns before you transfer anything.
          </p>
        </div>
      )}

      <p className="mt-8 text-xs leading-5 text-stone-500">
        Transfers from a card program to an airline are almost always one-way. Confirm the award seat exists first, then transfer, then book.
      </p>
    </div>
  );
}
