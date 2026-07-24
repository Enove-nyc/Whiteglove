import { NextResponse } from "next/server";

const duffelUrl = "https://api.duffel.com/air/offer_requests";

type Carrier = { name?: string; iata_code?: string; logo_symbol_url?: string; logo_lockup_url?: string };
type RawSegment = { origin?: { iata_code?: string; name?: string; terminal?: string }; destination?: { iata_code?: string; name?: string; terminal?: string }; departing_at?: string; arriving_at?: string; duration?: string; marketing_carrier?: Carrier; operating_carrier?: Carrier; marketing_carrier_flight_number?: string; aircraft?: { name?: string; iata_code?: string } };

export async function POST(request: Request) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ message: "Flight search will be available once the White Glove Duffel account is connected.", detail: "Add DUFFEL_ACCESS_TOKEN to the secure site settings. The key is never sent to visitors." });

  const body = await request.json();
  const { origin: submittedOrigin, destination: submittedDestination, departureDate, returnDate, maxConnections, cabin, departureTime } = body;
  const airportCode = (value: unknown) => String(value).toUpperCase().match(/([A-Z]{3})(?:\))?$/)?.[1] ?? "";
  const origin = airportCode(submittedOrigin); const destination = airportCode(submittedDestination);
  const multiCitySlices = Array.isArray(body.slices) ? body.slices.map((slice: { origin?: unknown; destination?: unknown; departureDate?: unknown }) => ({ origin: airportCode(slice.origin), destination: airportCode(slice.destination), departure_date: String(slice.departureDate ?? "") })) : null;
  if (multiCitySlices && (multiCitySlices.length < 2 || !multiCitySlices.every((slice: { origin: string; destination: string; departure_date: string }) => /^[A-Z]{3}$/.test(slice.origin) && /^[A-Z]{3}$/.test(slice.destination) && /^\d{4}-\d{2}-\d{2}$/.test(slice.departure_date)))) return NextResponse.json({ message: "Complete each multi-city flight with airports from the list and a departure date." }, { status: 400 });
  if (!multiCitySlices && (![origin, destination].every((value) => /^[A-Z]{3}$/.test(value)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(departureDate)))) return NextResponse.json({ message: "Choose an airport from the list, or enter a valid three-letter airport code." }, { status: 400 });
  if (!multiCitySlices && returnDate && (!/^\d{4}-\d{2}-\d{2}$/.test(String(returnDate)) || returnDate <= departureDate)) return NextResponse.json({ message: "Your return date must be after your departure date." }, { status: 400 });

  const slices = multiCitySlices ?? [{ origin, destination, departure_date: departureDate }, ...(returnDate ? [{ origin: destination, destination: origin, departure_date: returnDate }] : [])];
  const response = await fetch(duffelUrl, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "Duffel-Version": "v2", Authorization: `Bearer ${token}` }, body: JSON.stringify({ data: { slices, passengers: [{ type: "adult" }], cabin_class: ["economy", "premium_economy", "business", "first"].includes(cabin) ? cabin : "economy", max_connections: [0, 1, 2].includes(Number(maxConnections)) ? Number(maxConnections) : 2, return_offers: true } }), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ message: "Duffel could not complete this flight search right now." }, { status: 502 });
  const result = await response.json();
  const flights = (result.data?.offers ?? []).map((offer: { id: string; total_amount: string; total_currency: string; expires_at?: string; slices?: Array<{ segments?: RawSegment[] }> }) => {
    const detailedSlices = (offer.slices ?? []).map((slice) => ({ segments: (slice.segments ?? []).map((segment) => {
      const carrier = segment.marketing_carrier ?? segment.operating_carrier;
      const carrierCode = carrier?.iata_code ?? "";
      const number = segment.marketing_carrier_flight_number ?? "";
      return { origin: segment.origin?.iata_code ?? origin, originName: segment.origin?.name, originTerminal: segment.origin?.terminal, destination: segment.destination?.iata_code ?? destination, destinationName: segment.destination?.name, destinationTerminal: segment.destination?.terminal, departingAt: segment.departing_at ?? "", arrivingAt: segment.arriving_at ?? "", duration: segment.duration, airline: carrier?.name ?? "Airline", airlineLogo: carrier?.logo_symbol_url ?? carrier?.logo_lockup_url, flightNumber: number ? `${carrierCode}${number}` : carrierCode, aircraft: segment.aircraft?.name ?? segment.aircraft?.iata_code, operatingCarrier: segment.operating_carrier?.name };
    }) }));
    const segments = detailedSlices.flatMap((slice) => slice.segments); const first = segments[0];
    const route = detailedSlices.map((slice) => `${slice.segments[0]?.origin ?? origin} → ${slice.segments.at(-1)?.destination ?? destination}`).join(" · ");
    return { id: offer.id, airline: first?.airline ?? "Airline", airlineLogo: first?.airlineLogo, route, departure: first?.departingAt ?? "", stops: detailedSlices.reduce((total, slice) => total + Math.max(0, slice.segments.length - 1), 0), totalAmount: offer.total_amount, totalCurrency: offer.total_currency, expiresAt: offer.expires_at, slices: detailedSlices };
  }).filter((flight: { departure: string }) => { const hour = new Date(flight.departure).getHours(); return departureTime === "morning" ? hour < 12 : departureTime === "afternoon" ? hour >= 12 && hour < 17 : departureTime === "evening" ? hour >= 17 : true; }).slice(0, 12);
  return NextResponse.json({ message: flights.length ? `${flights.length} flight options found.` : "No flight options were returned for those dates.", flights });
}
