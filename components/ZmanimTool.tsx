"use client";

import { useMemo, useState, useTransition } from "react";
import { ACTION_BUTTON_CLASS } from "@/lib/action-button";
import type { ZmanimPlace } from "@/lib/zmanim-places";
import type { FoundPlace } from "@/lib/place-lookup";
import { calculateZmanim, todayInTimeZone, type ZmanimResult } from "@/lib/zmanim";

/**
 * Zmanim for anywhere.
 *
 * THREE WAYS TO SAY WHERE, and they are one field's worth of thought each.
 * Search for a city, a town or a postcode anywhere in the world; pick one of
 * the places the site already keeps; or type coordinates. Whichever is used,
 * the timezone is a real IANA zone with daylight saving in it — the old
 * fallback worked one out from the longitude alone, which is an hour wrong for
 * half the year and was reachable from the coordinate boxes.
 *
 * A SEARCH ANSWERS WITH A LIST. "11219" is a postcode in Brooklyn, in Vilnius
 * and in Stockholm, and the geocoder offers Vilnius first. Choosing for the
 * traveller would hand a Boro Park family Lithuanian zmanim and look right
 * doing it, so every match is shown with its country and somebody picks.
 *
 * The search runs when it is asked to rather than on every keystroke, which is
 * what OpenStreetMap's terms allow and what a phone on a hotel connection
 * wants anyway.
 */

type Props = {
  places: ZmanimPlace[];
  initialPlaceId?: string;
  initialDate?: string;
};

/** Where the coordinates in the boxes came from. */
type Origin =
  | { kind: "curated"; place: ZmanimPlace }
  | { kind: "found"; place: FoundPlace }
  | { kind: "manual" };

const FIELD = "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]";
const CAPTION = "text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500";

function curatedName(place: ZmanimPlace): string {
  return `${place.city} (${place.label.split(" — ")[1] ?? place.city})`;
}

function foundName(place: FoundPlace): string {
  return place.country ? `${place.name}, ${place.country}` : place.name;
}

function initialResult(place: ZmanimPlace | undefined, date: string): ZmanimResult | null {
  if (!place || !date) return null;
  try {
    return calculateZmanim({
      locationName: curatedName(place),
      latitude: place.latitude,
      longitude: place.longitude,
      timeZoneId: place.timeZoneId,
      date,
    });
  } catch {
    return null;
  }
}

export default function ZmanimTool({ places, initialPlaceId, initialDate }: Props) {
  const defaultPlace = places.find((place) => place.id === initialPlaceId) ?? places[0];
  const startingDate = initialDate ?? (defaultPlace ? todayInTimeZone(defaultPlace.timeZoneId) : "");

  const [origin, setOrigin] = useState<Origin>(
    defaultPlace ? { kind: "curated", place: defaultPlace } : { kind: "manual" },
  );
  const [date, setDate] = useState(startingDate);
  const [lat, setLat] = useState(defaultPlace ? String(defaultPlace.latitude) : "");
  const [lon, setLon] = useState(defaultPlace ? String(defaultPlace.longitude) : "");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ZmanimResult | null>(() => initialResult(defaultPlace, startingDate));
  const [pending, startTransition] = useTransition();

  // The worldwide search, kept apart from the calculation so a failed lookup
  // never takes the rest of the page with it.
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<FoundPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState<string | null>(null);

  const timeZoneId = origin.kind === "manual" ? null : origin.place.timeZoneId;
  const placeLabel = useMemo(() => {
    if (origin.kind === "curated") return curatedName(origin.place);
    if (origin.kind === "found") return foundName(origin.place);
    return null;
  }, [origin]);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setMatches(null);
      setSearchNote("Type at least three letters, or a full postcode.");
      return;
    }
    setSearching(true);
    setSearchNote(null);
    try {
      const response = await fetch(`/api/zmanim/places?q=${encodeURIComponent(q)}`);
      const data = response.ok ? ((await response.json()) as { places?: FoundPlace[] }) : null;
      const found = data?.places ?? [];
      setMatches(found);
      if (!found.length) {
        setSearchNote(
          response.ok
            ? "Nothing matched. Try the town rather than the street, or add the country."
            : "The place search could not be reached just now. The list below still works.",
        );
      }
    } catch {
      setMatches(null);
      setSearchNote("The place search could not be reached just now. The list below still works.");
    } finally {
      setSearching(false);
    }
  }

  function choose(place: FoundPlace) {
    setOrigin({ kind: "found", place });
    setLat(String(place.latitude));
    setLon(String(place.longitude));
    setMatches(null);
    setQuery(foundName(place));
    const when = date || todayInTimeZone(place.timeZoneId);
    setDate(when);
    show({ name: foundName(place), latitude: place.latitude, longitude: place.longitude, zone: place.timeZoneId, when });
  }

  function chooseCurated(id: string) {
    const place = places.find((item) => item.id === id);
    if (!place) return;
    setOrigin({ kind: "curated", place });
    setLat(String(place.latitude));
    setLon(String(place.longitude));
    setMatches(null);
    if (!date) setDate(todayInTimeZone(place.timeZoneId));
  }

  function show(input: { name: string; latitude: number; longitude: number; zone: string; when: string }) {
    setError(null);
    startTransition(() => {
      try {
        setResult(
          calculateZmanim({
            locationName: input.name,
            latitude: input.latitude,
            longitude: input.longitude,
            timeZoneId: input.zone,
            date: input.when,
          }),
        );
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : "Could not calculate times.");
      }
    });
  }

  async function run(event: React.FormEvent) {
    event.preventDefault();
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setResult(null);
      setError("Enter a latitude and longitude, or search for a place.");
      return;
    }

    // Coordinates typed by hand have no place to take a timezone from, so one
    // is looked up for them. Guessing it from the longitude, which is what this
    // used to do, drops daylight saving and reads an hour wrong all summer.
    let zone = timeZoneId;
    if (!zone) {
      setError(null);
      try {
        const response = await fetch(`/api/zmanim/places?lat=${latitude}&lon=${longitude}`);
        const data = response.ok ? ((await response.json()) as { timeZoneId?: string | null }) : null;
        zone = data?.timeZoneId ?? null;
      } catch {
        zone = null;
      }
      if (!zone) {
        setResult(null);
        setError("We could not work out the timezone for those coordinates. Try searching for the place by name.");
        return;
      }
    }

    show({
      name: placeLabel ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
      zone,
      when: date,
    });
  }

  return (
    <div className="space-y-8">
      {/* Anywhere in the world, and its own form so Enter searches rather than
          jumping to the calculation with the old place still in the boxes. */}
      <form className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6" onSubmit={search}>
        <label className="block" htmlFor="zmanim-place-search">
          <span className={CAPTION}>Search anywhere</span>
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            id="zmanim-place-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="City, town or postcode — Boro Park, 11219, Antwerp, NW11…"
            className="min-w-0 flex-1 rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {searchNote && <p className="mt-2 text-sm leading-6 text-stone-600">{searchNote}</p>}

        {/* Every match, with its country. One postcode belongs to several
            countries and picking for somebody would be silently wrong. */}
        {matches && matches.length > 0 && (
          <ul className="mt-3 divide-y divide-[var(--gold-light)] rounded-md border border-[var(--gold-light)] bg-white">
            {matches.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => choose(place)}
                  className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-3 text-left transition hover:bg-[var(--cream)]"
                >
                  <span className="text-sm font-semibold text-[var(--navy)]">{place.name}</span>
                  <span className="text-xs text-stone-500">
                    {place.country}
                    {place.country ? " · " : ""}
                    {place.timeZoneId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <form className="grid gap-4 rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6 md:grid-cols-2" onSubmit={run}>
        <label className="block md:col-span-2">
          <span className={CAPTION}>Or a place we keep</span>
          <select
            value={origin.kind === "curated" ? origin.place.id : ""}
            onChange={(event) => chooseCurated(event.target.value)}
            className={FIELD}
          >
            {/* Only while something else is in the boxes — a select with a
                permanent empty row reads as a question that was not answered. */}
            {origin.kind !== "curated" && <option value="">{placeLabel ?? "Your own coordinates"}</option>}
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.city}, {place.country} — {place.label.split(" — ")[1] ?? place.city}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={CAPTION}>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={FIELD} required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={CAPTION}>Latitude</span>
            <input
              value={lat}
              onChange={(event) => {
                setOrigin({ kind: "manual" });
                setLat(event.target.value);
              }}
              inputMode="decimal"
              className={FIELD}
              required
            />
          </label>
          <label className="block">
            <span className={CAPTION}>Longitude</span>
            <input
              value={lon}
              onChange={(event) => {
                setOrigin({ kind: "manual" });
                setLon(event.target.value);
              }}
              inputMode="decimal"
              className={FIELD}
              required
            />
          </label>
        </div>

        <p className="text-sm leading-6 text-stone-500 md:col-span-2">
          {timeZoneId
            ? `Timezone ${timeZoneId}.`
            : "The timezone for these coordinates is looked up when you press the button."}
        </p>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className={`inline-flex min-h-11 items-center ${ACTION_BUTTON_CLASS.primary} disabled:opacity-60`}
          >
            {pending ? "Calculating…" : "Show zmanim"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{result.locationName}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{result.attribution}</p>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {result.entries.map((entry) => (
              <div key={entry.id} className="flex items-baseline justify-between gap-3 border-b border-[var(--gold-light)] py-3">
                <dt>
                  <span className="font-semibold text-[var(--navy)]">{entry.label}</span>
                  {entry.note && <span className="mt-0.5 block text-xs text-stone-500">{entry.note}</span>}
                </dt>
                <dd className="font-[family-name:var(--font-display)] text-xl tabular-nums text-[var(--navy)]">
                  {entry.time ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-5 text-stone-500">
            Algorithm: {result.algorithm}. Library: kosher-zmanim (KosherJava). Place search: OpenStreetMap.
          </p>
        </section>
      )}
    </div>
  );
}
