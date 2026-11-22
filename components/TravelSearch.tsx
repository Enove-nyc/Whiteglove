"use client";

import { useId, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import DateField from "@/components/DateField";
import { Icon } from "@/components/icons/Icon";

/**
 * THE booking search — the same box on the home page and on /book.
 *
 * ONE COMPONENT ON PURPOSE (owner, 19 November 2026: "make sure every booking
 * screen is replicated against the other one"). The home page and the Book page
 * used to carry two different searches with different fields, so a traveller
 * met one form on the way in and another one a click later. Both pages now
 * render this, so they cannot drift apart.
 *
 * IT GOES STRAIGHT TO THE PARTNER (owner, 19 November 2026: a second booking
 * page in between was "an overloop"). Every tab hands off through /go, which
 * picks the partner on the server — Travelpayouts first — records the click and
 * opens the partner's results with the search filled in.
 *
 * IT FITS A PHONE SCREEN (owner: "you should not have to scroll"). Fields pair
 * up two to a row on a phone — from and to, the two dates — and the extra
 * choices (one way, travellers, rooms) sit in one short row above them.
 */

export { TRAVEL_TABS, type TravelTab } from "@/lib/travel-tabs";
import { TRAVEL_TABS, type TravelTab } from "@/lib/travel-tabs";

const SUBMIT: Record<TravelTab, string> = {
  flights: "Search flights",
  hotels: "Search hotels",
  cars: "Search cars",
  activities: "Find things to do",
  transfers: "Find a transfer",
  esim: "Find an eSIM",
  insurance: "Get a quote",
};

export type TravelSearchPrefill = {
  from?: string;
  to?: string;
  depart?: string;
  ret?: string;
  destination?: string;
};

/** One look for every box — typed, airport-picked or date-picked. */
const box =
  "min-h-12 w-full min-w-0 rounded-lg border border-[#D9D2C4] !bg-white px-3 text-[15px] text-[var(--ink)] outline-none placeholder:text-stone-500 focus:border-[var(--navy)] focus:ring-1 focus:ring-[var(--navy)]";
const withPin = `${box} pl-9`;
const pin = "pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-stone-500";
const label = "block text-[13px] font-semibold text-[var(--ink)]";
const small = "min-h-11 rounded-lg border border-[#D9D2C4] bg-white px-2.5 text-sm text-[var(--ink)] focus:border-[var(--navy)] focus:outline-none";

/** "Milan (MXP)" or "MXP" → "MXP"; anything else → "". */
export function airportCode(value: string): string {
  const v = value.trim().toUpperCase();
  const inBrackets = /\(([A-Z]{3})\)\s*$/.exec(v);
  if (inBrackets) return inBrackets[1];
  return /^[A-Z]{3}$/.test(v) ? v : "";
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const iso = (value?: string) => (value && ISO.test(value) ? value : "");

/**
 * The /go address for a search, or the sentence that says what is missing.
 * Pure, so the rules for each tab can be tested without a browser.
 */
export type TravelSearchState = {
  tab: TravelTab;
  page: string;
  placement: string;
  from: string;
  to: string;
  where: string;
  dropoffSame: boolean;
  dropoff: string;
  start: string;
  end: string;
  oneWay: boolean;
  /** A multi-city journey: two to six flights, in order. */
  multi?: boolean;
  legs?: Array<{ from: string; to: string; date: string }>;
  adults: number;
  rooms: number;
};
export function travelSearchHref(s: TravelSearchState): { href: string } | { error: string } {
  const query = new URLSearchParams({ page: s.page, placement: s.placement });
  // The three partner pages from "Find travel": the partner opens with the
  // place (and dates) where its link can carry them.
  if (s.tab === "transfers" || s.tab === "esim" || s.tab === "insurance") {
    if (!s.where.trim()) return { error: s.tab === "esim" ? "Enter the country you are visiting." : s.tab === "transfers" ? "Enter the airport or place you need a transfer from." : "Enter where you are travelling." };
    query.set("product", s.tab === "transfers" ? "transfer" : s.tab);
    query.set("destination", s.where.trim());
    if (s.tab !== "esim" && s.start) query.set("in", s.start);
    if (s.tab === "insurance" && s.end) query.set("out", s.end);
    return { href: `/go?${query.toString()}` };
  }
  if (s.tab === "activities") {
    if (!s.where.trim()) return { error: "Enter a city or place." };
    query.set("product", "activity");
    query.set("destination", s.where.trim());
    return { href: `/go?${query.toString()}` };
  }
  if (s.tab === "flights" && s.multi) {
    // MULTI-CITY (owner, 20 November 2026). Every leg needs both airports and
    // a date. It goes to Kayak, which takes the whole journey (Aviasales takes
    // one) and earns through the Stay22 Kayak wrap.
    const legs = (s.legs ?? []).map((leg) => ({ from: airportCode(leg.from), to: airportCode(leg.to), date: leg.date }));
    if (legs.length < 2) return { error: "Add at least two flights." };
    const missing = legs.findIndex((leg) => !leg.from || !leg.to || !leg.date);
    if (missing >= 0) return { error: `Flight ${missing + 1}: choose both airports from the list and a date.` };
    if (legs.some((leg, i) => i > 0 && leg.date < legs[i - 1].date)) return { error: "Put the flights in date order." };
    query.set("product", "flight");
    query.set("partner", "kayak");
    query.set("legs", legs.map((leg) => `${leg.from}-${leg.to}-${leg.date}`).join("_"));
    query.set("adults", String(s.adults));
    return { href: `/go?${query.toString()}` };
  }
  if (s.tab === "flights") {
    // The airport picker fills "Milan (MXP)"; the partner wants the code.
    const fromCode = airportCode(s.from);
    const toCode = airportCode(s.to);
    if (!fromCode || !toCode) return { error: "Choose the airports you are flying from and to from the list." };
    if (!s.start) return { error: "Choose the day you fly out." };
    if (!s.oneWay && !s.end) return { error: "Choose the day you fly back, or pick One way." };
    query.set("product", "flight");
    query.set("from", fromCode);
    query.set("to", toCode);
    query.set("in", s.start);
    if (!s.oneWay) query.set("out", s.end);
    query.set("adults", String(s.adults));
    return { href: `/go?${query.toString()}` };
  }
  if (s.tab === "hotels") {
    if (!s.where.trim()) return { error: "Enter where you are staying." };
    query.set("product", "hotel");
    query.set("destination", s.where.trim());
    query.set("adults", String(s.adults));
    query.set("rooms", String(s.rooms));
  } else {
    if (!s.where.trim()) return { error: "Enter where you are picking the car up." };
    if (!s.dropoffSame && !s.dropoff.trim()) return { error: "Enter where you are dropping the car off." };
    query.set("product", "car");
    query.set("destination", s.where.trim());
    if (!s.dropoffSame) query.set("dropoff", s.dropoff.trim());
  }
  if (s.start) query.set("in", s.start);
  if (s.end) query.set("out", s.end);
  return { href: `/go?${query.toString()}` };
}

export default function TravelSearch({
  initialTab = "flights",
  prefill,
  placement = "home-search",
  page = "/",
  rememberTab = false,
  lockedTab = false,
}: {
  initialTab?: TravelTab;
  prefill?: TravelSearchPrefill;
  /** Which spot on the site the click came from, for the earnings report. */
  placement?: string;
  page?: string;
  /** Keep the open tab in the address (?type=), so a reload lands on it. */
  rememberTab?: boolean;
  /** One search only, no tabs — the page for a single product (/find/…). */
  lockedTab?: boolean;
}) {
  const id = useId();
  const [tab, setTab] = useState<TravelTab>(initialTab);
  const [from, setFrom] = useState(prefill?.from ?? "");
  const [to, setTo] = useState(prefill?.to ?? "");
  const [where, setWhere] = useState(prefill?.destination ?? "");
  const [dropoffSame, setDropoffSame] = useState(true);
  const [dropoff, setDropoff] = useState("");
  // Days already gone are greyed out on the calendar.
  const [today] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; });
  const [start, setStart] = useState(iso(prefill?.depart));
  const [end, setEnd] = useState(iso(prefill?.ret));
  const [oneWay, setOneWay] = useState(false);
  const [multi, setMulti] = useState(false);
  const [legs, setLegs] = useState<Array<{ from: string; to: string; date: string }>>([
    { from: "", to: "", date: "" },
    { from: "", to: "", date: "" },
  ]);
  const setLeg = (index: number, patch: Partial<{ from: string; to: string; date: string }>) =>
    setLegs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const [adults, setAdults] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [error, setError] = useState("");

  function choose(next: TravelTab) {
    setTab(next);
    setError("");
    if (!rememberTab || typeof window === "undefined") return;
    // replaceState, not a navigation: a navigation would throw away what has
    // been typed, which is the very thing this protects.
    const url = new URL(window.location.href);
    url.searchParams.set("type", next);
    window.history.replaceState(null, "", url);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = travelSearchHref({ tab, page, placement, from, to, where, dropoffSame, dropoff, start, end, oneWay, multi, legs, adults, rooms });
    if ("error" in result) return setError(result.error);
    setError("");
    window.open(result.href, "_blank", "noopener");
  }

  const dateLabels =
    tab === "hotels" ? ["Check in", "Check out"]
      : tab === "cars" ? ["Pick-up date", "Drop-off date"]
        : tab === "insurance" ? ["Trip starts", "Trip ends"]
          : tab === "transfers" ? ["Date", ""]
            : ["Depart", "Return"];
  const showsDates = tab !== "activities" && tab !== "esim";
  const showsEnd = showsDates && tab !== "transfers" && !(tab === "flights" && oneWay);
  // Width of the place box on a wide screen, so each tab fills one row.
  const whereSpan =
    tab === "activities" || tab === "esim" ? "md:col-span-9"
      : tab === "cars" ? "md:col-span-3"
        : tab === "transfers" ? "md:col-span-8"
          : "md:col-span-6";
  const whereLabel =
    tab === "hotels" ? "Destination"
      : tab === "cars" ? "Pick-up location"
        : tab === "transfers" ? "From (airport, station or address)"
          : tab === "esim" ? "Country you are visiting"
            : tab === "insurance" ? "Destination"
              : "Where";
  const wherePlaceholder =
    tab === "activities" ? "City or place, e.g. Lake Como"
      : tab === "cars" ? "City or airport"
        : tab === "transfers" ? "e.g. Rome Fiumicino airport"
          : tab === "esim" || tab === "insurance" ? "Country"
            : "City or town";

  // ONE HEIGHT FOR EVERY TAB (owner, 20 November 2026: switching tabs "shakes
  // the whole page"). Things to do is a line shorter than the rest, so the box
  // keeps the tallest tab's height at each width and nothing below it moves.
  return (
    <form
      onSubmit={submit}
      aria-label="Search travel partners"
      className={`rounded-2xl border border-[#E6DCC8] bg-white p-4 shadow-[0_18px_50px_rgba(21,32,74,.14)] sm:p-6 ${lockedTab ? "" : "md:min-h-[246px]"}`}
    >
      {!lockedTab && <div role="tablist" aria-label="What are you booking?" className="-mx-1 flex flex-wrap gap-x-1 border-b border-[#E6DCC8] px-1">
        {TRAVEL_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-label={item.label}
            onClick={() => choose(item.id)}
            className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-none border-b-2 px-3 text-[15px] leading-tight transition ${
              tab === item.id
                ? "border-[var(--gold)] font-semibold text-[var(--navy)]"
                : "border-transparent text-stone-600 hover:text-[var(--navy)]"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>}

      {/* The extra choices, in one short row, so the fields below stay two to a row. */}
      {tab === "flights" || tab === "hotels" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tab === "flights" ? (
            <div role="radiogroup" aria-label="Trip type" className="inline-flex rounded-lg border border-[#D9D2C4] p-0.5">
              {[
                { t: "Return", on: !multi && !oneWay, pick: () => { setMulti(false); setOneWay(false); } },
                { t: "One way", on: !multi && oneWay, pick: () => { setMulti(false); setOneWay(true); } },
                { t: "Multi-city", on: multi, pick: () => { setMulti(true); setError(""); } },
              ].map((option) => (
                <button
                  key={option.t}
                  type="button"
                  role="radio"
                  aria-checked={option.on}
                  onClick={option.pick}
                  className={`min-h-10 rounded-md px-3 text-sm ${option.on ? "bg-[var(--navy)] font-semibold text-white" : "text-[var(--ink)]"}`}
                >
                  {option.t}
                </button>
              ))}
            </div>
          ) : null}
          <label className="sr-only" htmlFor={`${id}-adults`}>{tab === "flights" ? "Travellers" : "Guests"}</label>
          <select id={`${id}-adults`} value={adults} onChange={(event) => setAdults(Number(event.target.value))} className={small}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {tab === "flights" ? (n === 1 ? "traveller" : "travellers") : n === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
          {tab === "hotels" ? (
            <>
              <label className="sr-only" htmlFor={`${id}-rooms`}>Rooms</label>
              <select id={`${id}-rooms`} value={rooms} onChange={(event) => setRooms(Number(event.target.value))} className={small}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? "room" : "rooms"}</option>)}
              </select>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "flights" && multi ? (
        <div className="mt-3 space-y-3">
          {legs.map((leg, index) => (
            <fieldset key={index} className="grid grid-cols-2 gap-x-2.5 gap-y-2 sm:gap-x-3 md:grid-cols-12 md:items-end">
              <legend className="sr-only">Flight {index + 1}</legend>
              <div className="min-w-0 md:col-span-4">
                <span className={label}>Flight {index + 1} · From</span>
                <div className="relative mt-1">
                  <Icon name="map-pin" className={pin} />
                  <AirportAutocomplete value={leg.from} onChange={(value) => setLeg(index, { from: value })} placeholder="Where from?" className={withPin} />
                </div>
              </div>
              <div className="min-w-0 md:col-span-4">
                <span className={label}>To</span>
                <div className="relative mt-1">
                  <Icon name="map-pin" className={pin} />
                  <AirportAutocomplete value={leg.to} onChange={(value) => setLeg(index, { to: value })} placeholder="Where to?" className={withPin} />
                </div>
              </div>
              <div className="min-w-0 md:col-span-3">
                <span className={label}>Date</span>
                <div className="mt-1"><DateField value={leg.date} onChange={(value) => setLeg(index, { date: value })} min={index > 0 ? legs[index - 1].date || today : today} ariaLabel={`Flight ${index + 1} date`} className={box} /></div>
              </div>
              <div className="flex min-w-0 items-end md:col-span-1">
                {legs.length > 2 ? (
                  <button type="button" onClick={() => setLegs((rows) => rows.filter((_, i) => i !== index))} className="min-h-12 px-2 text-sm text-stone-600 underline" aria-label={`Remove flight ${index + 1}`}>
                    Remove
                  </button>
                ) : null}
              </div>
            </fieldset>
          ))}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {legs.length < 6 ? (
              <button
                type="button"
                onClick={() => setLegs((rows) => [...rows, { from: rows[rows.length - 1]?.to ?? "", to: "", date: "" }])}
                className="min-h-11 self-start rounded-lg border border-[#D9D2C4] px-4 text-sm font-semibold text-[var(--navy)]"
              >
                + Add another flight
              </button>
            ) : <span />}
            <button type="submit" className="min-h-12 rounded-lg bg-[var(--navy)] px-6 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)]">
              Search flights
            </button>
          </div>
        </div>
      ) : (
      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3 sm:gap-x-3 md:grid-cols-12 md:items-start">
        {tab === "flights" ? (
          <>
            <div className="min-w-0 md:col-span-3">
              <span className={label}>From</span>
              <div className="relative mt-1">
                <Icon name="map-pin" className={pin} />
                <AirportAutocomplete value={from} onChange={setFrom} placeholder="Where from?" className={withPin} />
              </div>
            </div>
            <div className="min-w-0 md:col-span-3">
              <span className={label}>To</span>
              <div className="relative mt-1">
                <Icon name="map-pin" className={pin} />
                <AirportAutocomplete value={to} onChange={setTo} placeholder="Where to?" className={withPin} />
              </div>
            </div>
          </>
        ) : (
          <div className={`col-span-2 min-w-0 ${whereSpan}`}>
            <label className={label} htmlFor={`${id}-where`}>
              {whereLabel}
            </label>
            <span className="relative mt-1 block">
              <Icon name="map-pin" className={pin} />
              {/* A dropdown of real places as you type (owner, 20 November 2026:
                  "the hotels should have a destination drop down"). Free
                  OpenStreetMap suggestions; see AddressAutocomplete. */}
              <AddressAutocomplete
                key={tab}
                id={`${id}-where`}
                mode="city"
                value={where}
                onChange={(value) => setWhere(value)}
                placeholder={wherePlaceholder}
                className={withPin}
              />
            </span>
            {tab === "cars" ? (
              <label className="mt-1.5 flex min-h-8 cursor-pointer items-center gap-2 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={dropoffSame}
                  onChange={(event) => setDropoffSame(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[var(--navy)]"
                />
                Drop off at the same place
              </label>
            ) : null}
          </div>
        )}

        {/* ALWAYS THERE, greyed while "same place" is ticked (owner, 20
            November 2026: ticking the box "still moves the whole page"). The
            box no longer appears and disappears, so nothing below it moves. */}
        {tab === "cars" ? (
          <div className="col-span-2 min-w-0 md:col-span-3">
            <label className={`${label} ${dropoffSame ? "text-stone-400" : ""}`} htmlFor={`${id}-dropoff`}>Drop-off location</label>
            <span className={`relative mt-1 block ${dropoffSame ? "pointer-events-none opacity-50" : ""}`} aria-disabled={dropoffSame || undefined}>
              <Icon name="map-pin" className={pin} />
              <AddressAutocomplete
                id={`${id}-dropoff`}
                mode="city"
                value={dropoffSame ? "" : dropoff}
                onChange={(value) => setDropoff(value)}
                placeholder={dropoffSame ? "Same as pick-up" : "City or airport"}
                className={withPin}
              />
            </span>
          </div>
        ) : null}

        {showsDates ? (
          <>
            <div className={`min-w-0 md:col-span-2 ${showsEnd ? "" : tab === "transfers" ? "col-span-2" : "col-span-2 md:col-span-4"}`}>
              <span className={label}>{dateLabels[0]}</span>
              <div className="mt-1"><DateField value={start} onChange={setStart} min={today} ariaLabel={dateLabels[0]} className={box} /></div>
            </div>
            {showsEnd ? (
              <div className="min-w-0 md:col-span-2">
                <span className={label}>{dateLabels[1]}</span>
                <div className="mt-1"><DateField value={end} onChange={setEnd} min={start || today} ariaLabel={dateLabels[1]} className={box} /></div>
              </div>
            ) : null}
          </>
        ) : null}

        <div className={`col-span-2 ${tab === "activities" || tab === "esim" ? "md:col-span-3" : "md:col-span-2"}`}>
          {/* An empty label's height, so the button lines up with the boxes on a wide screen. */}
          <span aria-hidden="true" className={`${label} hidden md:block`}>&nbsp;</span>
          <button
            type="submit"
            className="min-h-12 w-full rounded-lg bg-[var(--navy)] px-5 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)] md:mt-1"
          >
            {SUBMIT[tab]}
          </button>
        </div>
      </div>
      )}

      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
