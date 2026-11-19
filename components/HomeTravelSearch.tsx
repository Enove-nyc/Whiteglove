"use client";

import { useState } from "react";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import DateField from "@/components/DateField";
import { Icon, type IconName } from "@/components/icons/Icon";

/**
 * The home page's partner search (the owner's own design, 18 November 2026).
 *
 * IT GOES STRAIGHT TO THE PARTNER (owner, 19 November 2026: the home search
 * opening a second booking page was "an overloop"). Every tab hands off
 * through /go, which picks the partner on the server — Travelpayouts first —
 * records the click and opens the partner's results with the search filled in.
 * Nothing is stored and nothing is asked of the visitor beyond the search.
 */

type Tab = "flights" | "hotels" | "cars" | "activities";

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: "flights", label: "Flights", icon: "plane" },
  { id: "hotels", label: "Hotels", icon: "bed" },
  { id: "cars", label: "Car rentals", icon: "car" },
  { id: "activities", label: "Things to do", icon: "ticket" },
];

const SUBMIT: Record<Tab, string> = {
  flights: "Search flights",
  hotels: "Search hotels",
  cars: "Search cars",
  activities: "Find things to do",
};

/** One look for every box — typed, airport-picked or date-picked. */
const box =
  "min-h-12 w-full rounded-lg border border-[#D9D2C4] !bg-white px-3 text-[15px] text-[var(--ink)] outline-none placeholder:text-stone-500 focus:border-[var(--navy)] focus:ring-1 focus:ring-[var(--navy)]";
const withPin = `${box} pl-10`;
const pin = "pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-stone-500";
const label = "block text-sm font-semibold text-[var(--ink)]";

/** "Milan (MXP)" or "MXP" → "MXP"; anything else → "". */
function airportCode(value: string): string {
  const v = value.trim().toUpperCase();
  const inBrackets = /\(([A-Z]{3})\)\s*$/.exec(v);
  if (inBrackets) return inBrackets[1];
  return /^[A-Z]{3}$/.test(v) ? v : "";
}

export default function HomeTravelSearch() {
  const [tab, setTab] = useState<Tab>("flights");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [where, setWhere] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const query = new URLSearchParams({ page: "/", placement: "home-search" });
    if (tab === "activities") {
      if (!where.trim()) return setError("Enter a city or place.");
      query.set("product", "activity");
      query.set("destination", where.trim());
    } else if (tab === "flights") {
      // The airport picker fills "Milan (MXP)"; the partner wants the code.
      const fromCode = airportCode(from);
      const toCode = airportCode(to);
      if (!fromCode || !toCode) return setError("Choose the airports you are flying from and to from the list.");
      if (!start) return setError("Choose the day you fly out.");
      query.set("product", "flight");
      query.set("from", fromCode);
      query.set("to", toCode);
    } else {
      if (!where.trim()) return setError(tab === "hotels" ? "Enter where you are staying." : "Enter where you are picking the car up.");
      query.set("product", tab === "hotels" ? "hotel" : "car");
      query.set("destination", where.trim());
    }
    if (start) query.set("in", start);
    if (end) query.set("out", end);
    window.open(`/go?${query.toString()}`, "_blank", "noopener");
  }

  const showsDates = tab !== "activities";
  const datesLabel = tab === "hotels" ? ["Check in", "Check out"] : tab === "cars" ? ["Pick up", "Drop off"] : ["Depart", "Return"];

  return (
    <form
      onSubmit={submit}
      aria-label="Search travel partners"
      className="rounded-2xl border border-[#E6DCC8] bg-white p-4 shadow-[0_18px_50px_rgba(21,32,74,.14)] sm:p-6"
    >
      <div role="tablist" aria-label="What are you booking?" className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#E6DCC8] px-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setError("");
            }}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-none border-b-2 px-3 text-[15px] transition sm:px-4 ${
              tab === item.id
                ? "border-[var(--gold)] font-semibold text-[var(--navy)]"
                : "border-transparent text-stone-600 hover:text-[var(--navy)]"
            }`}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-12 md:items-end">
        {tab === "flights" ? (
          <>
            <div className="md:col-span-3">
              <span className={label}>From</span>
              <div className="relative mt-1.5">
                <Icon name="map-pin" className={pin} />
                <AirportAutocomplete value={from} onChange={setFrom} placeholder="Where from?" className={withPin} />
              </div>
            </div>
            <div className="md:col-span-3">
              <span className={label}>To</span>
              <div className="relative mt-1.5">
                <Icon name="map-pin" className={pin} />
                <AirportAutocomplete value={to} onChange={setTo} placeholder="Where to?" className={withPin} />
              </div>
            </div>
          </>
        ) : (
          <label className={tab === "activities" ? "md:col-span-9" : "md:col-span-6"}>
            <span className={label}>{tab === "hotels" ? "Destination" : tab === "cars" ? "Pick-up location" : "Where"}</span>
            <span className="relative mt-1.5 block">
              <Icon name="map-pin" className={pin} />
              <input
                value={where}
                onChange={(event) => setWhere(event.target.value)}
                placeholder={tab === "activities" ? "City or place, e.g. Lake Como" : "City or town"}
                className={withPin}
                autoComplete="off"
              />
            </span>
          </label>
        )}

        {showsDates && (
          <>
            <div className="md:col-span-2">
              <span className={label}>{datesLabel[0]}</span>
              <div className="mt-1.5"><DateField value={start} onChange={setStart} ariaLabel={datesLabel[0]} className={box} /></div>
            </div>
            <div className="md:col-span-2">
              <span className={label}>{datesLabel[1]}</span>
              <div className="mt-1.5"><DateField value={end} onChange={setEnd} min={start || undefined} ariaLabel={datesLabel[1]} className={box} /></div>
            </div>
          </>
        )}

        <div className={tab === "activities" ? "md:col-span-3" : "md:col-span-2"}>
          <button
            type="submit"
            className="min-h-12 w-full rounded-lg bg-[var(--navy)] px-5 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)]"
          >
            {SUBMIT[tab]}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
      <p className="mt-4 text-center text-sm text-stone-600">Book with our travel partners. We may earn a commission.</p>
    </form>
  );
}
