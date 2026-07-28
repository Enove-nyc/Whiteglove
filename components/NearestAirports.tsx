import { airportDirectionsUrl, airportsForCountry, formatKm, nearestAirports } from "@/lib/nearest-airports";

// "Nearest airports" note for a beis hachaim. Shows the 3 closest airports by
// straight-line distance (when we have the kever's coordinates), each with live
// links for exact driving and public-transit time from Google Maps. Falls back
// to the country's main airports when there are no coordinates.
export default function NearestAirports({
  coordinates,
  address,
  country,
  rankCoordinates,
}: {
  coordinates?: string;
  address?: string;
  country?: string;
  // City-level point for ranking when there's no grave GPS (never used for nav).
  rankCoordinates?: string;
}) {
  const byDistance = nearestAirports(coordinates ?? rankCoordinates, 3);
  const ranked = byDistance.length ? byDistance : airportsForCountry(country, 3);
  if (!ranked.length) return null;

  const haveDistance = byDistance.length > 0;

  return (
    <div className="mt-6 border-t border-[var(--gold-light)] pt-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Closest airports</p>
      <p className="mt-1 text-xs text-stone-500">
        {haveDistance ? "The three nearest airports with scheduled service — tap for exact driving or transit time." : `Main airports serving ${country} — tap for exact driving or transit time.`}
      </p>
      <ul className="mt-3 space-y-3">
        {ranked.map(({ airport, km }) => (
          <li key={airport.code} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-[var(--navy)]">{airport.city} ({airport.code})</span>
              <span className="text-xs text-stone-500">{airport.name}</span>
              {km !== null && <span className="text-xs font-semibold text-[var(--gold)]">· {formatKm(km)} straight-line</span>}
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">· {airport.size === "major" ? "major hub" : "regional"}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-0">
              <a href={airportDirectionsUrl(airport, address, coordinates, "driving")} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">🚗 By car →</a>
              <a href={airportDirectionsUrl(airport, address, coordinates, "transit")} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">🚆 Public transit →</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
