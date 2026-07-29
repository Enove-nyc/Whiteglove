"use client";

import { useEffect, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import { emptyItinerary, nextDate, type ItinActivity, type ItinFlight, type ItinLodging, type Itinerary } from "@/data/itinerary";

// Unified "Book" experience. The traveler makes two choices, in order:
//   1. how they're paying — cash or miles/points;
//   2. what they're booking — flights, hotels or cars.
// Cash hands off to a partner that takes payment (affiliate-ready deep links).
// Miles can't be handed off the same way: award seats and award nights come
// out of the traveler's own loyalty account, so nobody but them can complete
// the booking. There we help them find the award and check it's worth the
// points, then send them to their own program.
// Either way an item can be saved to their itinerary before they book.

type Pay = "cash" | "miles";
type Kind = "flights" | "hotels" | "cars";
export type Affiliate = { bookingAid?: string; kayakParams?: string; travelpayoutsMarker?: string };

// The search panel is laid out the way booking sites lay one out: fields sit
// shoulder to shoulder inside a single bordered block, divided by hairlines,
// rather than floating as separate boxes with gaps between them. The hairlines
// come from a 1px grid gap over a gold background, so they stay perfectly even
// however the grid wraps.
const inputClass = "mt-2 w-full border border-[var(--gold-light)] px-3 py-3 text-base text-[var(--navy)] outline-none transition focus:border-[var(--gold)]";
const caption = "text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]";
const fieldLabel = "text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500";
const bareInput = "mt-1.5 w-full min-w-0 border-0 bg-transparent p-0 text-[15px] font-normal normal-case tracking-normal text-[var(--navy)] outline-none placeholder:text-stone-400";

function SearchGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-px border border-[var(--gold-light)] bg-[var(--gold-light)] ${className}`}>{children}</div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col justify-center bg-[#fcfaf6] px-4 py-3 ${className}`}>
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
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
  const [pay, setPay] = useState<Pay>("cash");
  const [kind, setKind] = useState<Kind>("flights");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("type");
    if (requested === "flights" || requested === "hotels" || requested === "cars") setKind(requested);
  }, []);

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
    <div className="border border-[var(--gold-light)] bg-white shadow-[0_24px_60px_rgba(23,45,82,.10)]">
      {/* ---- How are you paying? A segmented control, so the choice reads as
           one control with two settings rather than two competing panels. ---- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-4 sm:px-7">
        <div className="inline-flex min-w-0 border border-[var(--gold-light)] bg-white p-1">
          <PayToggle active={pay === "cash"} onClick={() => setPay("cash")}>Cash</PayToggle>
          <PayToggle active={pay === "miles"} onClick={() => setPay("miles")}>Miles &amp; points</PayToggle>
        </div>
        <p className="min-w-0 text-xs leading-5 text-stone-500">
          {pay === "cash" ? "Compare and pay by card with a trusted partner." : "Find the award, check the value, book it in your own program."}
        </p>
      </div>

      {/* ---- What are you booking? ---- */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--gold-light)] px-5 pt-4 sm:px-7">
        <TabButton active={kind === "flights"} onClick={() => setKind("flights")}>Flights</TabButton>
        <TabButton active={kind === "hotels"} onClick={() => setKind("hotels")}>Hotels</TabButton>
        <TabButton active={kind === "cars"} onClick={() => setKind("cars")}>Cars</TabButton>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">

      {added && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--gold)] bg-[var(--cream)] p-4 text-sm">
          <span className="font-semibold text-[var(--navy)]">✓ Added to your trip.</span>
          <a href="/itinerary" className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)]">Open my itinerary planner →</a>
        </div>
      )}

      {pay === "cash" && kind === "flights" && <FlightsForm affiliate={affiliate} onAdd={addToTrip} />}
      {pay === "cash" && kind === "hotels" && <HotelsForm affiliate={affiliate} onAdd={addToTrip} />}
      {pay === "cash" && kind === "cars" && <CarsForm onAdd={addToTrip} />}

      {pay === "miles" && kind === "flights" && <MilesFlightsForm onAdd={addToTrip} />}
      {pay === "miles" && kind === "hotels" && <MilesHotelsForm onAdd={addToTrip} />}
      {pay === "miles" && kind === "cars" && <MilesCarsForm onAdd={addToTrip} />}

      </div>

      <p className="border-t border-[var(--gold-light)] bg-[#fcfaf6] px-5 py-4 text-xs leading-6 text-stone-500 sm:px-7">
        {pay === "cash"
          ? "Cash searches open with a trusted partner (Kayak, Booking.com) where you compare and pay securely. Save an item to your trip to keep it in your White Glove itinerary."
          : "Award bookings are always finished inside your own loyalty account — we never see your balances or your login. Save the item to your trip so the rest of your itinerary stays in one place."}
      </p>
    </div>
  );
}

type AddFn = (patch: { flights?: ItinFlight[]; lodging?: ItinLodging[]; activities?: ItinActivity[]; dates?: string[] }) => void;

// ---- Cash --------------------------------------------------------------

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
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TripTypeButton active={!oneWay} onClick={() => setOneWay(false)}>Round trip</TripTypeButton>
        <TripTypeButton active={oneWay} onClick={() => setOneWay(true)}>One way</TripTypeButton>
      </div>
      <SearchGrid className="sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From"><AirportAutocomplete value={from} onChange={setFrom} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="To"><AirportAutocomplete value={to} onChange={setTo} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="Departure"><input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} className={bareInput} /></Field>
        <Field label="Return" className={oneWay ? "opacity-45" : ""}><input type="date" value={ret} disabled={oneWay} min={depart || undefined} onChange={(e) => setRet(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow onSearch={search} onAdd={addToTrip} searchLabel="Search flights on Kayak" />
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
    <div>
      <SearchGrid className="sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_.8fr]">
        <Field label="Destination"><AddressAutocomplete mode="city" value={dest} onChange={(city) => setDest(city)} placeholder="City or town" className={bareInput} /></Field>
        <Field label="Check in"><input type="date" value={checkin} onChange={(e) => { const v = e.target.value; setCheckin(v); if (checkout && v && checkout <= v) setCheckout(nextDate(v)); }} className={bareInput} /></Field>
        <Field label="Check out"><input type="date" value={checkout} min={checkin ? nextDate(checkin) : undefined} onChange={(e) => setCheckout(e.target.value)} className={bareInput} /></Field>
        <Field label="Guests"><input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow onSearch={search} onAdd={addToTrip} searchLabel="Search hotels on Booking.com" />
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
    <div>
      <SearchGrid className="sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <Field label="Pick-up location"><AddressAutocomplete mode="city" value={loc} onChange={(city) => setLoc(city)} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="Pick-up date"><input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} className={bareInput} /></Field>
        <Field label="Drop-off date"><input type="date" value={dropoff} min={pickup || undefined} onChange={(e) => setDropoff(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <ActionRow onSearch={search} onAdd={addToTrip} searchLabel="Search cars on Kayak" />
    </div>
  );
}

function ActionRow({ onSearch, onAdd, searchLabel }: { onSearch: () => void; onAdd: () => void; searchLabel: string }) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button type="button" onClick={onSearch} className="min-h-[52px] min-w-0 flex-1 bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[var(--gold)]">{searchLabel} →</button>
      <button type="button" onClick={onAdd} className="min-h-[52px] min-w-0 border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:border-[var(--navy)] hover:text-white">+ Add to my trip</button>
    </div>
  );
}

function TripTypeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] border px-4 text-[11px] font-bold uppercase tracking-[0.12em] transition ${active ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold-light)] text-stone-500 hover:border-[var(--gold)] hover:text-[var(--navy)]"}`}
    >
      {children}
    </button>
  );
}

function PayToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition sm:px-6 ${active ? "bg-[var(--navy)] text-white" : "text-stone-500 hover:text-[var(--navy)]"}`}
    >
      {children}
    </button>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`-mb-px min-h-[44px] border-b-2 px-3 text-xs font-bold uppercase tracking-[0.1em] transition sm:px-5 sm:tracking-[0.14em] ${active ? "border-[var(--gold)] text-[var(--navy)]" : "border-transparent text-stone-500 hover:text-[var(--navy)]"}`}
    >
      {children}
    </button>
  );
}

// ---- Booking with miles & points ---------------------------------------
// Award seats and award nights can only be redeemed inside the traveler's own
// loyalty account — no third party can book them. So each of these does the
// two things that genuinely help: find where the award is, and work out
// whether spending the points beats paying cash.

const FLIGHT_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Amex Membership Rewards", award: "https://www.americanexpress.com/en-us/travel/" },
  { label: "Chase Ultimate Rewards", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Miles", award: "https://travel.capitalone.com/" },
  { label: "United MileagePlus", award: "https://www.united.com/en/us/book-flight/united-award-travel" },
  { label: "Delta SkyMiles", award: "https://www.delta.com/" },
  { label: "American AAdvantage", award: "https://www.aa.com/" },
  { label: "Air Canada Aeroplan", award: "https://www.aircanada.com/aeroplan" },
  { label: "Flying Blue (Air France/KLM)", award: "https://wwws.airfrance.us/flying-blue" },
  { label: "El Al Matmid", award: "https://www.elal.com/" },
];

const HOTEL_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Marriott Bonvoy", award: "https://www.marriott.com/" },
  { label: "Hilton Honors", award: "https://www.hilton.com/" },
  { label: "World of Hyatt", award: "https://www.hyatt.com/" },
  { label: "IHG One Rewards", award: "https://www.ihg.com/" },
  { label: "Accor ALL", award: "https://all.accor.com/" },
  { label: "Wyndham Rewards", award: "https://www.wyndhamhotels.com/wyndham-rewards" },
  { label: "Choice Privileges", award: "https://www.choicehotels.com/choice-privileges" },
  { label: "Amex Membership Rewards (travel portal)", award: "https://www.americanexpress.com/en-us/travel/" },
  { label: "Chase Ultimate Rewards (travel portal)", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Miles (travel portal)", award: "https://travel.capitalone.com/" },
];

const CAR_PROGRAMS: Array<{ label: string; award: string }> = [
  { label: "Amex Travel (pay with points)", award: "https://www.americanexpress.com/en-us/travel/car-rental/" },
  { label: "Chase Travel (pay with points)", award: "https://ultimaterewards.chase.com/" },
  { label: "Capital One Travel (pay with miles)", award: "https://travel.capitalone.com/" },
  { label: "Avis Preferred", award: "https://www.avis.com/en/association/partners" },
  { label: "Hertz Gold Plus Rewards", award: "https://www.hertz.com/rentacar/loyalty/gold-plus-rewards" },
  { label: "Sixt Card", award: "https://www.sixt.com/sixt-card/" },
];

function ProgramSelect({ programs, value, onChange, label }: { programs: Array<{ label: string; award: string }>; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${bareInput} -ml-0.5 cursor-pointer`}>
        <option value="">Choose your program…</option>
        {programs.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
      </select>
    </Field>
  );
}

/**
 * Cents per point = (what the cash booking costs, minus anything you still pay
 * on the award) ÷ the points it takes. The standard way to judge a redemption.
 */
function ValueCalculator({ unit, cashLabel, feesLabel, pointsPlaceholder, cashPlaceholder }: {
  unit: string;
  cashLabel: string;
  feesLabel: string;
  pointsPlaceholder: string;
  cashPlaceholder: string;
}) {
  const [points, setPoints] = useState("");
  const [cash, setCash] = useState("");
  const [fees, setFees] = useState("");

  const pointsNum = Number(points.replace(/[^\d.]/g, ""));
  const cashNum = Number(cash.replace(/[^\d.]/g, ""));
  const feesNum = Number(fees.replace(/[^\d.]/g, "")) || 0;
  const cpp = pointsNum > 0 && cashNum > 0 ? ((cashNum - feesNum) / pointsNum) * 100 : null;
  const verdict =
    cpp === null ? null
    : cpp >= 2 ? { text: "Strong value — worth redeeming.", tone: "text-emerald-700" }
    : cpp >= 1.2 ? { text: "Reasonable value.", tone: "text-[var(--navy)]" }
    : { text: "Weak value — paying cash is probably better.", tone: "text-amber-800" };

  return (
    <>
      <SearchGrid className="mt-2 sm:grid-cols-3">
        <Field label={`${unit} required`}><input inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} placeholder={pointsPlaceholder} className={bareInput} /></Field>
        <Field label={cashLabel}><input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder={cashPlaceholder} className={bareInput} /></Field>
        <Field label={feesLabel}><input inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0" className={bareInput} /></Field>
      </SearchGrid>
      {cpp !== null && verdict && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-3xl leading-none text-[var(--navy)]">{cpp.toFixed(2)}¢ <span className="text-base text-stone-500">per point</span></p>
          <p className={`text-sm font-semibold ${verdict.tone}`}>{verdict.text}</p>
          <p className="mt-1 basis-full text-xs leading-5 text-stone-500">
            Worked out as (cash price − what you still pay on the award) ÷ points. Around 1.2¢ is typical; 2¢ or more is usually a good redemption.
            Compare against what your own program normally returns before you transfer anything.
          </p>
        </div>
      )}
    </>
  );
}

function MilesNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-[var(--gold)] bg-white px-4 py-3 text-sm leading-6 text-stone-700">{children}</div>
  );
}

function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return <p className="mt-8 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)]">{n} · {children}</p>;
}

const linkPrimary = "inline-flex min-h-[44px] items-center border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]";
const linkGhost = "inline-flex min-h-[44px] items-center border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white";

function MilesFlightsForm({ onAdd }: { onAdd: AddFn }) {
  const [program, setProgram] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const selected = FLIGHT_PROGRAMS.find((p) => p.label === program);
  const query = from.trim() && to.trim() ? `?from=${encodeURIComponent(from.trim())}&to=${encodeURIComponent(to.trim())}` : "";

  function addToTrip() {
    const o = airportCode(from);
    const d = airportCode(to);
    if (!o || !d || !when) return;
    onAdd({ flights: [{ id: uid(), from: o, to: d, date: when, bookedOnSite: false }], dates: [when] });
  }

  return (
    <div>
      <MilesNote>
        <strong className="text-[var(--navy)]">How award flights work.</strong>{" "}No website can redeem your miles for you — award seats
        come out of your own loyalty account, so the booking is always finished on the airline&apos;s own site. What we do here is help
        you find the seats and check the redemption is worth it.
      </MilesNote>

      <SearchGrid className="mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <ProgramSelect programs={FLIGHT_PROGRAMS} value={program} onChange={setProgram} label="Your miles" />
        <Field label="From"><AirportAutocomplete value={from} onChange={setFrom} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="To"><AirportAutocomplete value={to} onChange={setTo} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="When"><input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>

      <StepLabel n={1}>Find award seats (free tools)</StepLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        <a href={`https://www.pointsyeah.com/search${query}`} target="_blank" rel="noreferrer" className={linkPrimary}>Search award seats on PointsYeah →</a>
        <a href="https://seats.aero/search" target="_blank" rel="noreferrer" className={linkGhost}>Search on seats.aero →</a>
        {selected && <a href={selected.award} target="_blank" rel="noreferrer" className={linkGhost}>Open {program} →</a>}
      </div>
      <p className="mt-2 text-xs text-stone-500">Independent award-search sites, free to use. We don&apos;t see your balances or your account.</p>

      <StepLabel n={2}>Is it worth using your miles?</StepLabel>
      <ValueCalculator unit="Miles" cashLabel="Cash price of the same ticket" feesLabel="Taxes/fees you still pay" pointsPlaceholder="45000" cashPlaceholder="900" />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={addToTrip} className={linkGhost}>+ Add this flight to my trip</button>
      </div>
      <p className="mt-6 text-xs leading-5 text-stone-500">
        Transfers from a card program to an airline are almost always one-way. Confirm the award seat exists first, then transfer, then book.
      </p>
    </div>
  );
}

function MilesHotelsForm({ onAdd }: { onAdd: AddFn }) {
  const [program, setProgram] = useState("");
  const [dest, setDest] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [error, setError] = useState("");
  const selected = HOTEL_PROGRAMS.find((p) => p.label === program);

  function addToTrip() {
    if (!dest.trim() || !checkin || !checkout) { setError("Enter a city and both dates first."); return; }
    if (checkout <= checkin) { setError("Check-out must be after check-in."); return; }
    setError("");
    onAdd({
      lodging: [{ id: uid(), type: "hotel", name: `Award stay in ${dest.trim()}${program ? ` (${program})` : ""}`, address: dest.trim(), checkIn: checkin, checkOut: checkout, bookedOnSite: false }],
      dates: [checkin, checkout],
    });
  }

  return (
    <div>
      <MilesNote>
        <strong className="text-[var(--navy)]">How award nights work.</strong>{" "}Points nights are booked inside your own hotel program,
        so the reservation is always completed on the chain&apos;s own site. Use the calculator below before you book — hotel points are
        worth very different amounts depending on the chain and the property.
      </MilesNote>

      <SearchGrid className="mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <ProgramSelect programs={HOTEL_PROGRAMS} value={program} onChange={setProgram} label="Your points" />
        <Field label="Destination"><AddressAutocomplete mode="city" value={dest} onChange={(city) => setDest(city)} placeholder="City or town" className={bareInput} /></Field>
        <Field label="Check in"><input type="date" value={checkin} onChange={(e) => { const v = e.target.value; setCheckin(v); if (checkout && v && checkout <= v) setCheckout(nextDate(v)); }} className={bareInput} /></Field>
        <Field label="Check out"><input type="date" value={checkout} min={checkin ? nextDate(checkin) : undefined} onChange={(e) => setCheckout(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <StepLabel n={1}>Find award availability</StepLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        {selected
          ? <a href={selected.award} target="_blank" rel="noreferrer" className={linkPrimary}>Open {program} →</a>
          : <span className="text-sm text-stone-500">Choose your program above and its award booking page opens here.</span>}
        <a href="https://awardmapper.com/" target="_blank" rel="noreferrer" className={linkGhost}>See which chains have hotels here →</a>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Award Mapper is a free independent tool for seeing which loyalty programs have properties in a city — useful before you commit points.
      </p>

      <StepLabel n={2}>Is it worth using your points?</StepLabel>
      <ValueCalculator unit="Points" cashLabel="Cash price of the same stay" feesLabel="Resort/other fees still charged" pointsPlaceholder="60000" cashPlaceholder="750" />
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Compare the whole stay, not one night — many programs discount longer award stays. Check the kosher-food situation separately;
        an award property miles from anything kosher can cost more in taxis than the points saved.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={addToTrip} className={linkGhost}>+ Add this stay to my trip</button>
      </div>
    </div>
  );
}

function MilesCarsForm({ onAdd }: { onAdd: AddFn }) {
  const [program, setProgram] = useState("");
  const [loc, setLoc] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");
  const selected = CAR_PROGRAMS.find((p) => p.label === program);

  function addToTrip() {
    if (!loc.trim() || !pickup || !dropoff) { setError("Enter a pick-up city and both dates first."); return; }
    if (dropoff < pickup) { setError("Drop-off must be on or after pick-up."); return; }
    setError("");
    onAdd({
      activities: [{ id: uid(), name: `Rental car — ${loc.trim()}`, date: pickup, notes: `Drop-off ${dropoff}${program ? ` · booking with ${program}` : ""}`, bookedOnSite: false }],
      dates: [pickup, dropoff],
    });
  }

  return (
    <div>
      <MilesNote>
        <strong className="text-[var(--navy)]">Be honest about cars.</strong>{" "}Rental cars are usually the weakest way to spend points —
        card travel portals let you pay for one with points at a fixed rate, which is convenient but rarely good value. Run the numbers
        below before you do it; paying cash and keeping the points for a flight is very often the better trip.
      </MilesNote>

      <SearchGrid className="mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <ProgramSelect programs={CAR_PROGRAMS} value={program} onChange={setProgram} label="Your program" />
        <Field label="Pick-up location"><AddressAutocomplete mode="city" value={loc} onChange={(city) => setLoc(city)} placeholder="City or airport" className={bareInput} /></Field>
        <Field label="Pick-up date"><input type="date" value={pickup} onChange={(e) => setPickup(e.target.value)} className={bareInput} /></Field>
        <Field label="Drop-off date"><input type="date" value={dropoff} min={pickup || undefined} onChange={(e) => setDropoff(e.target.value)} className={bareInput} /></Field>
      </SearchGrid>
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <StepLabel n={1}>Book with your points</StepLabel>
      <div className="mt-2 flex flex-wrap gap-3">
        {selected
          ? <a href={selected.award} target="_blank" rel="noreferrer" className={linkPrimary}>Open {program} →</a>
          : <span className="text-sm text-stone-500">Choose a program above and its booking page opens here.</span>}
        <a href={`https://www.kayak.com/cars${loc.trim() && pickup && dropoff ? `/${encodeURIComponent(loc.trim())}/${pickup}/${dropoff}` : ""}`} target="_blank" rel="noreferrer" className={linkGhost}>Check the cash price on Kayak →</a>
      </div>

      <StepLabel n={2}>Is it worth using your points?</StepLabel>
      <ValueCalculator unit="Points" cashLabel="Cash price of the same rental" feesLabel="Anything still charged at the counter" pointsPlaceholder="30000" cashPlaceholder="300" />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={addToTrip} className={linkGhost}>+ Add this car to my trip</button>
      </div>
      <p className="mt-6 text-xs leading-5 text-stone-500">
        Rental-car loyalty programs mostly earn you airline miles rather than let you spend them — worth linking your frequent-flyer
        number at the counter either way.
      </p>
    </div>
  );
}
