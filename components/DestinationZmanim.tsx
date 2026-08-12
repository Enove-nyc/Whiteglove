import Link from "next/link";
import {
  calculateZmanim,
  compactZmanim,
  parseCoordinates,
  todayInTimeZone,
} from "@/lib/zmanim";
import { timeZoneForPlace, zmanimPlaces } from "@/lib/zmanim-places";

type Props = {
  placeName: string;
  city: string;
  country: string;
  coordinates: string;
};

/**
 * Compact today's zmanim for a destination page when a published coordinate exists.
 */
export default function DestinationZmanim({ placeName, city, country, coordinates }: Props) {
  const point = parseCoordinates(coordinates);
  if (!point) return null;

  const zone = timeZoneForPlace(city, country, point.lon);
  const date = todayInTimeZone(zone.timeZoneId);
  const matchedPlace = zmanimPlaces().find(
    (place) =>
      place.city.toLocaleLowerCase("en") === city.toLocaleLowerCase("en") && place.coordinates === coordinates,
  );

  let entries;
  let attribution: string;
  try {
    const result = calculateZmanim({
      locationName: placeName,
      latitude: point.lat,
      longitude: point.lon,
      timeZoneId: matchedPlace?.timeZoneId ?? zone.timeZoneId,
      date,
    });
    entries = compactZmanim(result);
    attribution = result.attribution;
  } catch {
    return null;
  }

  if (!entries.length) return null;

  const zmanimHref = matchedPlace
    ? `/zmanim?place=${encodeURIComponent(matchedPlace.id)}`
    : `/zmanim?place=${encodeURIComponent(city)}`;

  return (
    <div className="mt-6 rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Zmanim for today</p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{placeName}</h3>
        </div>
        <Link
          href={zmanimHref}
          className="text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Full zmanim →
        </Link>
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-baseline justify-between gap-3 border-b border-[var(--gold-light)] py-2">
            <dt className="text-sm text-stone-600">{entry.label}</dt>
            <dd className="font-[family-name:var(--font-display)] text-lg tabular-nums text-[var(--navy)]">{entry.time}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-5 text-stone-500">{attribution}</p>
      {(matchedPlace?.timeZoneApproximate || zone.approximate) && (
        <p className="mt-1 text-xs leading-5 text-amber-800">Timezone estimated from longitude — confirm with local custom.</p>
      )}
    </div>
  );
}
