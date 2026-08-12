"use client";

import Link from "next/link";
import { useBookingLink } from "@/components/BookingLinkProvider";
import { bookingHref } from "@/lib/booking-access";
import { useEffect, useState } from "react";
import { useSaveAuth } from "@/components/SaveAuthProvider";
import { activityFromPlace, fetchAccountPlaces, PLACES_EVENT } from "@/lib/account-trip-client";
import { placeRole, type SavedPlace } from "@/data/route-utils";
import { ADD_TO_ROUTE_LABEL, ADD_TO_TRIP_LABEL, SAVE_ACCOUNT_BENEFIT } from "@/lib/save-copy";
import { useSignedIn } from "@/lib/use-signed-in";

/**
 * Everything you can do with a destination, in one bar, on every destination
 * page.
 *
 * Saving — route, trip, favourite — belongs to an account. Nearby, airports
 * and share do not.
 */

export type NearbyAirport = { code: string; name: string; km: string; directionsUrl: string };

const base =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.11em] transition disabled:opacity-60";
const idle = `${base} border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]`;
const done = `${base} border-[var(--navy)] bg-[var(--navy)] text-white`;
const quiet = `${base} border-[var(--gold-light)] text-stone-600 hover:border-[var(--gold)] hover:text-[var(--navy)]`;

type Nearby = { name: string; yiddishName?: string; href: string; km: number };

export default function DestinationActions({
  place,
  airports = [],
  kind = "heritage",
}: {
  place: SavedPlace;
  /** Worked out on the server, where the airport list already lives. */
  airports?: NearbyAirport[];
  /** Heritage stops go on the route; vacation places go on the trip. */
  kind?: "heritage" | "vacation";
}) {
  const signedIn = useSignedIn();
  const { requireSave, busy } = useSaveAuth();
  const booking = useBookingLink();
  const [route, setRoute] = useState<SavedPlace[]>([]);
  const [favorites, setFavorites] = useState<SavedPlace[]>([]);
  const [onTrip, setOnTrip] = useState(false);
  const [panel, setPanel] = useState<"nearby" | "airports" | null>(null);
  const [nearby, setNearby] = useState<Nearby[] | null>(null);
  const [shared, setShared] = useState("");

  useEffect(() => {
    if (!signedIn) {
      setRoute([]);
      setFavorites([]);
      return;
    }
    const sync = () => {
      void fetchAccountPlaces().then((places) => {
        if (!places) return;
        setRoute(places.route);
        setFavorites(places.favorites);
      });
    };
    sync();
    window.addEventListener(PLACES_EVENT, sync);
    return () => window.removeEventListener(PLACES_EVENT, sync);
  }, [signedIn]);

  const favorite = favorites.some((item) => item.id === place.id);
  const role = placeRole(route, place.id);

  const openNearby = async () => {
    setPanel(panel === "nearby" ? null : "nearby");
    if (nearby || !place.coordinates) return;
    try {
      const response = await fetch(`/api/itinerary/nearby?coordinates=${encodeURIComponent(place.coordinates)}&exclude=${encodeURIComponent(place.name)}`);
      const data = await response.json();
      setNearby(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setNearby([]);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? new URL(place.href ?? "/", window.location.origin).toString() : "";
    const payload = { title: place.name, text: `${place.name} — White Glove Itineraries`, url };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared("Link copied.");
    } catch {
      setShared(url);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {signedIn === null ? (
          <span className="h-11" aria-hidden="true" />
        ) : (
          <>
            {kind === "heritage" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    requireSave(
                      role === "absent"
                        ? { type: "add-place-to-route", place }
                        : { type: "remove-place-from-route", placeId: place.id, name: place.name },
                    )
                  }
                  className={role === "absent" ? idle : done}
                  aria-pressed={role !== "absent"}
                >
                  {busy ? "Saving…" : role === "absent" ? ADD_TO_ROUTE_LABEL : "On your route"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => requireSave({ type: "anchor-route", place, anchor: "start" })}
                  className={role === "start" ? done : quiet}
                  aria-pressed={role === "start"}
                >
                  {role === "start" ? "Starts here" : "Start route here"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => requireSave({ type: "anchor-route", place, anchor: "end" })}
                  className={role === "end" ? done : quiet}
                  aria-pressed={role === "end"}
                >
                  {role === "end" ? "Ends here" : "End route here"}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                requireSave(favorite ? { type: "remove-favorite", placeId: place.id } : { type: "add-favorite", place })
              }
              className={favorite ? done : idle}
              aria-pressed={favorite}
            >
              {favorite ? "Saved" : "Save destination"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                requireSave({ type: "add-activity-to-trip", activity: activityFromPlace(place) });
                if (signedIn) setOnTrip(true);
              }}
              className={onTrip ? done : idle}
            >
              {onTrip ? "On your trip" : ADD_TO_TRIP_LABEL}
            </button>
          </>
        )}

        {place.coordinates && (
          <button type="button" onClick={openNearby} className={quiet} aria-expanded={panel === "nearby"}>
            Nearby destinations
          </button>
        )}
        {airports.length > 0 && (
          <button type="button" onClick={() => setPanel(panel === "airports" ? null : "airports")} className={quiet} aria-expanded={panel === "airports"}>
            Nearest airport
          </button>
        )}
        <button type="button" onClick={share} className={quiet}>
          Share
        </button>
      </div>

      {signedIn === false && <p className="mt-3 text-sm leading-6 text-stone-600">{SAVE_ACCOUNT_BENEFIT}</p>}
      {shared && <p className="mt-3 text-sm font-semibold text-[var(--navy)]">{shared}</p>}

      {panel === "nearby" && (
        <div className="mt-4 rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Also near {place.name}</p>
          {nearby === null ? (
            <p className="mt-2 text-sm text-stone-500">Looking…</p>
          ) : nearby.length === 0 ? (
            <p className="mt-2 text-sm text-stone-600">Nothing else of ours within a reasonable drive of here.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {nearby.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm text-[var(--navy)] hover:bg-[var(--cream-deep)]">
                    <span>{item.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-stone-500">{Math.round(item.km)} km</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {panel === "airports" && (
        <div className="mt-4 rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">Flying in</p>
          <ul className="mt-3 space-y-1">
            {airports.map((airport) => (
              <li key={airport.code} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-[var(--navy)]">
                  <strong>{airport.code}</strong> — {airport.name} {airport.km && <span className="text-stone-500">({airport.km})</span>}
                </span>
                <span className="flex gap-2">
                  <a href={airport.directionsUrl} target="_blank" rel="noreferrer" className={quiet}>
                    Driving time
                  </a>
                  <Link href={bookingHref(booking, { type: "flights", to: airport.code })} className={quiet}>
                    Find flights
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
