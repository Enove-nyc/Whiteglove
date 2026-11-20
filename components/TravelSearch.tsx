"use client";

import { useId, useState } from "react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import DateField from "@/components/DateField";
import { Icon, type IconName } from "@/components/icons/Icon";

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

export type TravelTab = "flights" | "hotels" | "cars" | "activities";

/** `short` is what fits four across on a phone without being cut off. */
export const TRAVEL_TABS: Array<{ id: TravelTab; label: string; short: string; icon: IconName }> = [
  { id: "flights", label: "Flights", short: "Flights", icon: "plane" },
  { id: "hotels", label: "Hotels", short: "Hotels", icon: "bed" },
  { id: "cars", label: "Car rentals", short: "Cars", icon: "car" },
  { id: "activities", label: "Things to do", short: "Activities", icon: "ticket" },
];

const SUBMIT: Record<TravelTab, string> = {
  flights: "Search flights",
  hotels: "Search hotels",
  cars: "Search cars",
  activities: "Find things to do",
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
  adults: number;
  rooms: number;
};
export function travelSearchHref(s: TravelSearchState): { href: string } | { error: string } {
  const query = new URLSearchParams({ page: s.page, placement: s.placement });
  if (s.tab === "activities") {
    if (!s.where.trim()) return { error: "Enter a city or place." };
    query.set("product", "activity");
    query.set("destination", s.where.trim());
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
}: {
  initialTab?: TravelTab;
  prefill?: TravelSearchPrefill;
  /** Which spot on the site the click came from, for the earnings report. */
  placement?: string;
  page?: string;
  /** Keep the open tab in the address (?type=), so a reload lands on it. */
  rememberTab?: boolean;
}) {
  const id = useId();
  const [tab, setTab] = useState<TravelTab>(initialTab);
  const [from, setFrom] = useState(prefill?.from ?? "");
  const [to, setTo] = useState(prefill?.to ?? "");
  const [where, setWhere] = useState(prefill?.destination ?? "");
  const [dropoffSame, setDropoffSame] = useState(true);
  const [dropoff, setDropoff] = useState("");
  const [start, setStart] = useState(iso(prefill?.depart));
  const [end, setEnd] = useState(iso(prefill?.ret));
  const [oneWay, setOneWay] = useState(false);
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
    const result = travelSearchHref({ tab, page, placement, from, to, where, dropoffSame, dropoff, start, end, oneWay, adults, rooms });
    if ("error" in result) return setError(result.error);
    setError("");
    window.open(result.href, "_blank", "noopener");
  }

  const dateLabels = tab === "hotels" ? ["Check in", "Check out"] : tab === "cars" ? ["Pick-up date", "Drop-off date"] : ["Depart", "Return"];
  const showsEnd = !(tab === "flights" && oneWay);

  // ONE HEIGHT FOR EVERY TAB (owner, 20 November 2026: switching tabs "shakes
  // the whole page"). Things to do is a line shorter than the rest, so the box
  // keeps the tallest tab's height at each width and nothing below it moves.
  return (
    <form
      onSubmit={submit}
      aria-label="Search travel partners"
      className="min-h-[372px] rounded-2xl border border-[#E6DCC8] bg-white p-3 shadow-[0_18px_50px_rgba(21,32,74,.14)] sm:min-h-[388px] sm:p-6 md:min-h-[246px]"
    >
      <div role="tablist" aria-label="What are you booking?" className="-mx-1 grid grid-cols-4 border-b border-[#E6DCC8] px-1 sm:flex sm:gap-1">
        {TRAVEL_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-label={item.label}
            onClick={() => choose(item.id)}
            className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-none border-b-2 px-1 text-[12px] leading-tight transition sm:flex-row sm:gap-2 sm:px-4 sm:text-[15px] ${
              tab === item.id
                ? "border-[var(--gold)] font-semibold text-[var(--navy)]"
                : "border-transparent text-stone-600 hover:text-[var(--navy)]"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate sm:hidden">{item.short}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* The extra choices, in one short row, so the fields below stay two to a row. */}
      {tab === "flights" || tab === "hotels" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tab === "flights" ? (
            <div role="radiogroup" aria-label="Trip type" className="inline-flex rounded-lg border border-[#D9D2C4] p-0.5">
              {[{ v: false, t: "Return" }, { v: true, t: "One way" }].map((option) => (
                <button
                  key={option.t}
                  type="button"
                  role="radio"
                  aria-checked={oneWay === option.v}
                  onClick={() => setOneWay(option.v)}
                  className={`min-h-10 rounded-md px-3 text-sm ${oneWay === option.v ? "bg-[var(--navy)] font-semibold text-white" : "text-[var(--ink)]"}`}
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
          <div className={`col-span-2 min-w-0 ${tab === "activities" ? "md:col-span-9" : tab === "cars" && !dropoffSame ? "md:col-span-3" : "md:col-span-6"}`}>
            <label className={label} htmlFor={`${id}-where`}>
              {tab === "hotels" ? "Destination" : tab === "cars" ? "Pick-up location" : "Where"}
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
                placeholder={tab === "activities" ? "City or place, e.g. Lake Como" : tab === "cars" ? "City or airport" : "City or town"}
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

        {tab === "cars" && !dropoffSame ? (
          <div className="col-span-2 min-w-0 md:col-span-3">
            <label className={label} htmlFor={`${id}-dropoff`}>Drop-off location</label>
            <span className="relative mt-1 block">
              <Icon name="map-pin" className={pin} />
              <AddressAutocomplete
                id={`${id}-dropoff`}
                mode="city"
                value={dropoff}
                onChange={(value) => setDropoff(value)}
                placeholder="City or airport"
                className={withPin}
              />
            </span>
          </div>
        ) : null}

        {tab !== "activities" ? (
          <>
            <div className={`min-w-0 md:col-span-2 ${showsEnd ? "" : "col-span-2 md:col-span-4"}`}>
              <span className={label}>{dateLabels[0]}</span>
              <div className="mt-1"><DateField value={start} onChange={setStart} ariaLabel={dateLabels[0]} className={box} /></div>
            </div>
            {showsEnd ? (
              <div className="min-w-0 md:col-span-2">
                <span className={label}>{dateLabels[1]}</span>
                <div className="mt-1"><DateField value={end} onChange={setEnd} min={start || undefined} ariaLabel={dateLabels[1]} className={box} /></div>
              </div>
            ) : null}
          </>
        ) : null}

        <div className={`col-span-2 ${tab === "activities" ? "md:col-span-3" : "md:col-span-2"}`}>
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

      {tab === "cars" && !dropoffSame ? (
        <p className="mt-2 text-xs leading-5 text-stone-600">The partner&rsquo;s page opens at your pick-up place; confirm the drop-off there.</p>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
