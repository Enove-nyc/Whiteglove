export type FlightSegment = {
  origin: string; originName?: string; originTerminal?: string;
  destination: string; destinationName?: string; destinationTerminal?: string;
  departingAt: string; arrivingAt: string; duration?: string;
  airline: string; airlineLogo?: string; flightNumber?: string; aircraft?: string; operatingCarrier?: string;
  checkedBags?: number; carryOnBags?: number;
};
export type FlightOption = {
  id: string; airline: string; airlineLogo?: string; route: string; departure: string;
  stops: number; passengerCount?: number; totalAmount: string; totalCurrency: string; expiresAt?: string;
  slices: { segments: FlightSegment[]; duration?: string }[];
  refundable?: boolean; changeable?: boolean;
};

export type FlightFilters = {
  sort: string; airline: string; stops: string; departure: string; arrival: string;
  currency: string; minPrice: string; maxPrice: string; maxDuration: string;
  maxLayover: string; baggage: string; flexibility: string;
};
export const defaultFlightFilters: FlightFilters = {
  sort: "cheapest", airline: "", stops: "", departure: "", arrival: "",
  currency: "", minPrice: "", maxPrice: "", maxDuration: "", maxLayover: "", baggage: "", flexibility: "",
};

export function durationMinutes(iso?: string): number | undefined {
  const match = iso?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match || !match.slice(1).some(Boolean)) return undefined;
  return Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) + Number(match[4] ?? 0) / 60;
}

export function layoverMinutes(arrival: string, departure: string): number | undefined {
  // Both timestamps are local to the connection airport. UTC parsing prevents
  // the user's own time zone from changing the elapsed connection time.
  const local = (value: string) => Date.parse(value.replace(/(?:Z|[+-]\d\d:\d\d)$/, "") + "Z");
  const minutes = (local(departure) - local(arrival)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : undefined;
}

export function timeBand(timestamp?: string): string {
  const hour = Number(timestamp?.match(/T(\d{2}):/)?.[1]);
  if (!Number.isFinite(hour)) return "";
  return hour < 6 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export function flightMetrics(flight: FlightOption) {
  const segments = flight.slices.flatMap(slice => slice.segments);
  const layovers = flight.slices.flatMap(slice => slice.segments.slice(1).map((segment, index) => layoverMinutes(slice.segments[index].arrivingAt, segment.departingAt)));
  const sliceTimes = flight.slices.map(slice => {
    const supplied = durationMinutes(slice.duration);
    if (supplied !== undefined) return supplied;
    const parts = [...slice.segments.map(s => durationMinutes(s.duration)), ...slice.segments.slice(1).map((s, i) => layoverMinutes(slice.segments[i].arrivingAt, s.departingAt))];
    return parts.length && parts.every(p => p !== undefined) ? parts.reduce<number>((sum, p) => sum + (p ?? 0), 0) : undefined;
  });
  const totalDuration = sliceTimes.length && sliceTimes.every(t => t !== undefined) ? sliceTimes.reduce<number>((sum, t) => sum + (t ?? 0), 0) : undefined;
  const bags = (key: "checkedBags" | "carryOnBags") => segments.length && segments.every(s => s[key] !== undefined) ? Math.min(...segments.map(s => s[key]!)) : undefined;
  return {
    price: Number(flight.totalAmount),
    airlines: [...new Set(segments.map(s => s.airline).concat(flight.airline))],
    maxStops: flight.slices.length ? Math.max(...flight.slices.map(s => Math.max(0, s.segments.length - 1))) : flight.stops,
    departure: timeBand(flight.departure),
    arrival: timeBand(flight.slices[0]?.segments.at(-1)?.arrivingAt),
    duration: totalDuration,
    layover: layovers.some(t => t === undefined) ? undefined : Math.max(0, ...layovers.map(t => t ?? 0)),
    checked: bags("checkedBags"), carryOn: bags("carryOnBags"),
  };
}

export function filterFlightResults(flights: FlightOption[], filters: FlightFilters): FlightOption[] {
  const bounded = (value: number | undefined, maximum: string) => !maximum || (value !== undefined && value <= Number(maximum));
  const matches = flights.map(flight => ({ flight, ...flightMetrics(flight) })).filter(row =>
    (!filters.airline || row.airlines.includes(filters.airline)) &&
    (!filters.stops || (filters.stops === "2+" ? row.maxStops >= 2 : row.maxStops === Number(filters.stops))) &&
    (!filters.departure || row.departure === filters.departure) &&
    (!filters.arrival || row.arrival === filters.arrival) &&
    (!filters.currency || row.flight.totalCurrency === filters.currency) &&
    (!filters.minPrice || row.price >= Number(filters.minPrice)) &&
    bounded(row.price, filters.maxPrice) &&
    bounded(row.duration, filters.maxDuration) &&
    bounded(row.layover, filters.maxLayover) &&
    (!filters.baggage || (filters.baggage !== "checked" && filters.baggage !== "both" || (row.checked ?? 0) > 0) && (filters.baggage !== "carry-on" && filters.baggage !== "both" || (row.carryOn ?? 0) > 0)) &&
    (!filters.flexibility || (filters.flexibility !== "refundable" && filters.flexibility !== "both" || row.flight.refundable === true) && (filters.flexibility !== "changeable" && filters.flexibility !== "both" || row.flight.changeable === true))
  );
  const cheapest = new Map<string, number>();
  const fastest = new Map<string, number>();
  for (const row of matches) {
    const c = row.flight.totalCurrency;
    cheapest.set(c, Math.min(cheapest.get(c) ?? Infinity, row.price));
    if (row.duration !== undefined) fastest.set(c, Math.min(fastest.get(c) ?? Infinity, row.duration));
  }
  const score = (row: typeof matches[number]) =>
    row.price / Math.max(1, cheapest.get(row.flight.totalCurrency) ?? 1) +
    (row.duration ?? Infinity) / Math.max(1, fastest.get(row.flight.totalCurrency) ?? 1) + 0.2 * row.maxStops;
  return matches.sort((a, b) => {
    // Never compare nominal dollar amounts with euros or other currencies.
    const currency = a.flight.totalCurrency.localeCompare(b.flight.totalCurrency);
    const price = a.price - b.price;
    if (filters.sort === "fastest") return (a.duration ?? Infinity) - (b.duration ?? Infinity) || currency || price;
    if (filters.sort === "best") return currency || score(a) - score(b) || price;
    if (filters.sort === "departure") return a.flight.departure.localeCompare(b.flight.departure) || currency || price;
    return currency || (filters.sort === "highest" ? -price : price);
  }).map(row => row.flight);
}
