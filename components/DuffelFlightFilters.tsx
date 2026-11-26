"use client";

import { useState, type ReactNode } from "react";
import { defaultFlightFilters, filterFlightResults, flightMetrics, type FlightFilters, type FlightOption } from "@/lib/duffel-flight-results";

const inputClass = "mt-1 min-h-11 w-full rounded border border-[var(--gold-light)] bg-white px-3 text-sm font-normal text-stone-700";
const times = [["", "Any time"], ["night", "12am – 6am"], ["morning", "6am – 12pm"], ["afternoon", "12pm – 5pm"], ["evening", "5pm – midnight"]];
const hours = (values: number[]) => [["", "Any duration"], ...values.map(h => [String(h * 60), `Up to ${h} hours`])];
export default function DuffelFlightFilters({ flights, renderFlight }: { flights: FlightOption[]; renderFlight: (flight: FlightOption) => ReactNode }) {
  const [filters, setFilters] = useState(defaultFlightFilters);
  const [limit, setLimit] = useState(20);
  function change(key: keyof FlightFilters, value: string) {
    setFilters(previous => ({ ...previous, [key]: value }));
    setLimit(20);
  }
  const airlines = [...new Set(flights.flatMap(flight => flightMetrics(flight).airlines))].sort();
  const currencies = [...new Set(flights.map(flight => flight.totalCurrency))].sort();
  const results = filterFlightResults(flights, filters);
  function select(key: keyof FlightFilters, label: string, options: string[][]) {
    return <label className="text-xs font-semibold text-[var(--navy)]">{label}
      <select aria-label={label} className={inputClass} value={filters[key]} onChange={event => change(key, event.target.value)}>
        {options.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    </label>;
  }
  return <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,2.4fr)]">
    <aside className="self-start rounded-lg border border-[var(--gold-light)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-[var(--navy)]">Filter flights</h2>
        <button type="button" className="min-h-11 text-sm underline" onClick={() => {setFilters(defaultFlightFilters);setLimit(20);}}>Clear filters</button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {select("airline", "Airline", [["", "All airlines"], ...airlines.map(a => [a, a])])}
        {select("stops", "Stops per journey", [["", "Any stops"], ["0", "Nonstop"], ["1", "1 stop"], ["2+", "2 or more stops"]])}
        {select("departure", "Outbound departure", times)}
        {select("arrival", "Outbound arrival", times)}
        {currencies.length > 1 && select("currency", "Currency", [["", "All currencies"], ...currencies.map(c => [c,c])])}
        <div className="grid grid-cols-2 gap-2">
          {(["minPrice","maxPrice"] as const).map((key, i) => <label key={key} className="text-xs font-semibold text-[var(--navy)]">{i === 0 ? "Min price" : "Max price"}{currencies.length === 1 ? ` (${currencies[0]})` : ""}<input className={inputClass} type="number" min="0" step="any" value={filters[key]} onChange={event => change(key,event.target.value)} /></label>)}
        </div>
        {select("maxDuration", "Total flight journey duration", hours([3,6,8,12,18,24,36,48]))}
        {select("maxLayover", "Longest layover", hours([1,2,3,4,6,8,12]))}
        {select("baggage", "Included baggage", [["","Any allowance"],["carry-on","Carry-on"],["checked","Checked bag"],["both","Carry-on and checked bag"]])}
        {select("flexibility", "Fare flexibility", [["","Any fare"],["refundable","Refunds allowed"],["changeable","Changes allowed"],["both","Refunds and changes allowed"]])}
      </div>
    </aside>
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p role="status" className="text-sm text-stone-600">{results.length} of {flights.length} flights</p>
        {select("sort", "Sort by", [["cheapest","Lowest price first"],["best","Best overall"],["fastest","Fastest"],["highest","Highest price first"],["departure","Earliest departure"]])}
      </div>
      <div className="mt-4 space-y-4">{results.slice(0, limit).map(renderFlight)}</div>
      {!results.length && <p className="mt-5 rounded border border-[var(--gold-light)] bg-white p-4 text-sm">No flights match these filters. Clear or adjust your filters to see more options.</p>}
      {limit < results.length && <button type="button" onClick={() => setLimit(n => n + 20)} className="mt-5 min-h-11 w-full rounded border border-[var(--gold)] font-semibold text-[var(--navy)]">Show more flights ({results.length-limit} remaining)</button>}
    </div>
  </div>;
}
