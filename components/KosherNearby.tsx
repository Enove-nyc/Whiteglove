"use client";

import { useMemo, useState } from "react";
import { coordinatesToPoint, placeMapUrl } from "@/data/route-utils";
import type { ItinActivity } from "@/data/itinerary";
import {
  curatedKosherPlacesNear,
  searchCuratedKosherPlaces,
  type CuratedKosherPlace,
} from "@/lib/curated-kosher";
import HechsherBadge from "@/components/HechsherBadge";
import { hechsherOf, useHechsherim } from "@/lib/use-hechsherim";

const LS_KEY = "whiteGloveItinerary";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

function formatKm(km?: number) {
  if (km === undefined) return "";
  const mi = km * 0.621371;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km · ${Math.round(mi)} mi`;
}

function addKosherToTrip(place: CuratedKosherPlace) {
  try {
    const saved = localStorage.getItem(LS_KEY);
    const itinerary = saved ? JSON.parse(saved) : { title: "My trip", startDate: "", endDate: "", flights: [], lodging: [], activities: [] };
    const activity: ItinActivity = {
      id: uid(),
      name: place.name,
      address: place.address,
      coordinates: place.lat === undefined || place.lng === undefined ? undefined : `${place.lat}, ${place.lng}`,
      date: itinerary.startDate || "",
      notes: [place.category, place.diet].filter(Boolean).join(" · ") || "Kosher",
      bookedOnSite: false,
    };
    itinerary.activities = [...(itinerary.activities ?? []), activity];
    localStorage.setItem(LS_KEY, JSON.stringify(itinerary));
    void fetch("/api/account/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itinerary }),
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export default function KosherNearby({
  coordinates,
  query,
  radiusKm = 8,
  limit = 12,
  showAddToTrip = false,
  heading = "Kosher food nearby",
}: {
  coordinates?: string;
  query?: string;
  radiusKm?: number;
  limit?: number;
  /** Retained for existing callers; curated results are available immediately. */
  autoLoad?: boolean;
  showAddToTrip?: boolean;
  heading?: string;
}) {
  const point = useMemo(() => coordinatesToPoint(coordinates), [coordinates]);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const places = useMemo(() => {
    if (query?.trim()) return searchCuratedKosherPlaces(query);
    return point ? curatedKosherPlacesNear(point, radiusKm) : [];
  }, [point, query, radiusKm]);
  const shown = useMemo(() => places.slice(0, limit), [places, limit]);
  const { statuses: confirmed, agencies } = useHechsherim(useMemo(() => shown.map((place) => place.id), [shown]));

  if (!point && !query?.trim()) return null;

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">{heading}</p>

      {shown.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">
          {query?.trim()
            ? "No White Glove kosher listings match that search."
            : `No White Glove kosher listings are within ${radiusKm} km of here.`}{" "}
          <a href="/kosher" className="underline decoration-[var(--gold)] underline-offset-2">Browse the kosher food finder.</a>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--gold-light)]">
          {shown.map((place) => {
            const hechsher = hechsherOf(confirmed, place, agencies);
            const coordinatesForMap =
              place.lat === undefined || place.lng === undefined ? undefined : `${place.lat}, ${place.lng}`;
            return (
              <li key={place.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-[family-name:var(--font-display)] text-lg text-[var(--navy)]">{place.name}</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--gold-ink)]">
                    {[place.category, place.diet, formatKm("km" in place ? place.km : undefined)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-stone-600">{[place.city, place.country, place.address].filter(Boolean).join(" — ")}</p>
                {hechsher.state !== "unverified" && (
                  <div className="mt-1.5">
                    <HechsherBadge status={hechsher} size="sm" agencies={agencies} />
                  </div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {coordinatesForMap && (
                    <a
                      href={placeMapUrl(place.address, coordinatesForMap)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                    >
                      Open in Maps →
                    </a>
                  )}
                  {place.phone && <a href={`tel:${place.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Call {place.phone}</a>}
                  {place.website && <a href={place.website} target="_blank" rel="noreferrer" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">Website →</a>}
                  {showAddToTrip && (
                    <button
                      type="button"
                      onClick={() => {
                        if (addKosherToTrip(place)) setAdded((current) => ({ ...current, [place.id]: true }));
                      }}
                      className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                    >
                      {added[place.id] ? "Added ✓" : "Add to my trip"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length > 0 && (
        <p className="mt-3 text-[11px] leading-5 text-stone-500">
          White Glove listings use published locations and editorially maintained details. Confirm current supervision directly before you go.
        </p>
      )}
    </div>
  );
}
