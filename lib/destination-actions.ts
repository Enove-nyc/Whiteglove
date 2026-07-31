import type { NearbyAirport } from "@/components/DestinationActions";
import { airportDirectionsUrl, airportsForCountry, formatKm, nearestAirports } from "@/lib/nearest-airports";

/**
 * The airports for a destination, worked out on the server.
 *
 * The airport list is a large table that the actions bar needs three rows of.
 * Shipping the table to the browser to pick three would be the whole thing in
 * the bundle for every destination page, so the picking happens here and only
 * the three rows cross over.
 *
 * Falls back to the country's main airports when there are no coordinates,
 * which is the same rule the "Closest airports" panel already uses — a
 * destination with no GPS still has an airport somebody flies into.
 */
export function airportsFor(
  country: string | undefined,
  address: string | undefined,
  coordinates: string | undefined,
): NearbyAirport[] {
  const byDistance = nearestAirports(coordinates, 3);
  const ranked = byDistance.length ? byDistance : airportsForCountry(country, 3);
  return ranked.map(({ airport, km }) => ({
    code: airport.code,
    name: airport.name,
    // Empty rather than "unknown": with no coordinates there is no distance,
    // and a made-up one beside a real airport code is worse than none.
    km: km === null ? "" : formatKm(km),
    directionsUrl: airportDirectionsUrl(airport, address, coordinates, "driving"),
  }));
}
