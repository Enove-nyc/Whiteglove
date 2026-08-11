"use client";

import { useMemo, useState, useTransition } from "react";
import type { ZmanimPlace } from "@/lib/zmanim-places";
import { calculateZmanim, todayInTimeZone, type ZmanimResult } from "@/lib/zmanim";

type Props = {
  places: ZmanimPlace[];
  initialPlaceId?: string;
  initialDate?: string;
};

function initialResult(place: ZmanimPlace | undefined, date: string): ZmanimResult | null {
  if (!place || !date) return null;
  try {
    return calculateZmanim({
      locationName: `${place.city} (${place.label.split(" — ")[1] ?? place.city})`,
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
  const [placeId, setPlaceId] = useState(defaultPlace?.id ?? "");
  const [date, setDate] = useState(initialDate ?? (defaultPlace ? todayInTimeZone(defaultPlace.timeZoneId) : ""));
  const [lat, setLat] = useState(defaultPlace ? String(defaultPlace.latitude) : "");
  const [lon, setLon] = useState(defaultPlace ? String(defaultPlace.longitude) : "");
  const [customMode, setCustomMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ZmanimResult | null>(() =>
    initialResult(defaultPlace, initialDate ?? (defaultPlace ? todayInTimeZone(defaultPlace.timeZoneId) : "")),
  );
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => places.find((place) => place.id === placeId), [places, placeId]);

  function applyPlace(id: string) {
    const place = places.find((item) => item.id === id);
    setPlaceId(id);
    setCustomMode(false);
    if (!place) return;
    setLat(String(place.latitude));
    setLon(String(place.longitude));
    if (!date) setDate(todayInTimeZone(place.timeZoneId));
  }

  function run() {
    setError(null);
    startTransition(() => {
      try {
        const latitude = Number(lat);
        const longitude = Number(lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error("Enter a latitude and longitude.");
        }
        const place = customMode ? null : (selected ?? null);
        const timeZoneId = place?.timeZoneId ?? guessZone(longitude);
        const locationName = place
          ? `${place.city} (${place.label.split(" — ")[1] ?? place.city})`
          : `Custom location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        setResult(
          calculateZmanim({
            locationName,
            latitude,
            longitude,
            timeZoneId,
            date,
          }),
        );
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : "Could not calculate times.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <form
        className="grid gap-4 rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <label className="block md:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Place</span>
          <select
            value={customMode ? "__custom__" : placeId}
            onChange={(event) => {
              if (event.target.value === "__custom__") {
                setCustomMode(true);
                return;
              }
              applyPlace(event.target.value);
            }}
            className="mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]"
          >
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.city}, {place.country} — {place.label.split(" — ")[1] ?? place.city}
              </option>
            ))}
            <option value="__custom__">Enter latitude and longitude</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Latitude</span>
            <input
              value={lat}
              onChange={(event) => {
                setCustomMode(true);
                setLat(event.target.value);
              }}
              inputMode="decimal"
              className="mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]"
              required
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Longitude</span>
            <input
              value={lon}
              onChange={(event) => {
                setCustomMode(true);
                setLon(event.target.value);
              }}
              inputMode="decimal"
              className="mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]"
              required
            />
          </label>
        </div>

        {selected && !customMode && (
          <p className="md:col-span-2 text-sm leading-6 text-stone-500">
            Timezone {selected.timeZoneId}
            {selected.timeZoneApproximate ? " (estimated from longitude — confirm locally)" : ""}.
          </p>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)] disabled:opacity-60"
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
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              {result.locationName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{result.attribution}</p>
            <p className="mt-1 text-sm leading-6 text-stone-500">{result.disclaimer}</p>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {result.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-baseline justify-between gap-3 border-b border-[var(--gold-light)] py-3"
              >
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
            Algorithm: {result.algorithm}. Library: kosher-zmanim (KosherJava).
          </p>
        </section>
      )}
    </div>
  );
}

function guessZone(longitude: number): string {
  const hours = Math.round(longitude / 15);
  if (hours === 0) return "UTC";
  const sign = hours > 0 ? "-" : "+";
  return `Etc/GMT${sign}${Math.abs(hours)}`;
}
