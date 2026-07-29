"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SavedPlace } from "@/data/route-utils";

type AccountSnapshot = {
  email: string;
  route: SavedPlace[];
  favorites: SavedPlace[];
};

/**
 * One trip in the account. Somebody planning Switzerland next week, Kraków in
 * a fortnight and Poland the month after has three of these, and until now the
 * account page did not admit they existed — it showed one route, so the second
 * and third trips were only findable from inside the planner.
 */
type Trip = {
  id: string;
  name: string;
  active: boolean;
  stops: number;
  places: number;
  days: number;
  startDate: string;
  endDate: string;
  shared: boolean;
};

/** "2 – 9 August 2026", or "Dates not set yet". */
function tripDates(trip: Trip): string {
  const parse = (d: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? "");
    return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : null;
  };
  const from = parse(trip.startDate);
  const to = parse(trip.endDate);
  if (!from) return "Dates not set yet";
  const long = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  if (!to || +to === +from) return long(from);
  const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear();
  return sameMonth ? `${from.getUTCDate()} – ${long(to)}` : `${long(from)} – ${long(to)}`;
}

const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as SavedPlace[];
  } catch {
    return [];
  }
};

export default function AccountRoutePanel({ loggedIn = false }: { loggedIn?: boolean }) {
  const router = useRouter();
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  // Only read browser-local saves for the anonymous preview. When the user is
  // logged in, their account (server) is the single source of truth — otherwise
  // places saved while browsing anonymously would leak into a new account.
  const [route, setRoute] = useState<SavedPlace[]>(() => (loggedIn ? [] : read("whiteGloveMyRoute")));
  const [favorites, setFavorites] = useState<SavedPlace[]>(() => (loggedIn ? [] : read("whiteGloveFavorites")));
  // Null until the answer is known — an account with no trips and an account
  // that has not loaded yet are different things, and "0 itineraries" on a
  // trip you spent an hour on would be alarming.
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    const syncLocal = () => {
      setRoute(read("whiteGloveMyRoute"));
      setFavorites(read("whiteGloveFavorites"));
    };

    const syncRemote = async () => {
      const response = await fetch("/api/account/me", { cache: "no-store" });
      const data = await response.json().catch(() => null) as { account?: { email?: string }; data?: { route?: SavedPlace[]; favorites?: SavedPlace[] } | null } | null;
      if (data?.account?.email && data.data) {
        setAccount({
          email: data.account.email,
          route: data.data.route ?? [],
          favorites: data.data.favorites ?? [],
        });
      }
    };

    const syncTrips = async () => {
      const response = await fetch("/api/account/trips", { cache: "no-store" });
      if (!response.ok) return; // not signed in, or no account store connected
      const data = await response.json().catch(() => null) as { trips?: Trip[] } | null;
      if (data?.trips) setTrips(data.trips);
    };

    // Anonymous preview follows local storage; logged-in view follows the account.
    if (!loggedIn) {
      syncLocal();
      window.addEventListener("whiteglove-route", syncLocal);
    }
    syncRemote().catch(() => undefined);
    syncTrips().catch(() => undefined);
    return () => window.removeEventListener("whiteglove-route", syncLocal);
  }, [loggedIn]);

  const activeRoute = loggedIn ? account?.route ?? [] : account?.route ?? route;
  const activeFavorites = loggedIn ? account?.favorites ?? [] : account?.favorites ?? favorites;
  const sourceLabel = account ? `Synced to ${account.email}` : loggedIn ? "Synced to your account" : "Saved in this browser";

  // Switching trip and opening the planner in one press. Without the switch the
  // planner would open whichever trip was last active, not the one pressed.
  async function openTrip(id: string) {
    setOpening(id);
    try {
      await fetch("/api/account/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", id }),
      });
    } catch {
      /* the planner still opens; it just opens the trip that was already active */
    }
    router.push("/itinerary");
  }

  return (
    <>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {trips && (
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Itineraries</p>
            <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{trips.length}</p>
            <p className="mt-3 leading-7 text-stone-600">
              {trips.length === 1 ? "Trip planned in your account." : "Trips planned in your account."}
            </p>
          </div>
        )}
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">My Route</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{activeRoute.length}</p>
          <p className="mt-3 leading-7 text-stone-600">Destinations in your active journey.</p>
        </div>
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Favorites</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{activeFavorites.length}</p>
          <p className="mt-3 leading-7 text-stone-600">Places saved for another time.</p>
        </div>
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Storage</p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{sourceLabel}</p>
          <p className="mt-3 leading-7 text-stone-600">When you are logged in, saved places are available on every device.</p>
        </div>
      </div>

      {trips && (
        <div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Your itineraries</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
                {trips.length > 1 ? `${trips.length} trips on the go.` : "One trip on the go."}
              </h2>
              {/* The thing worth saying plainly: they do not replace each other. */}
              <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
                Each trip keeps its own dates, stops, flights and share link, so a week in Switzerland, a fortnight in
                Kraków and a month in Poland can all be planned at once.
              </p>
            </div>
            <Link
              href="/itinerary"
              className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
            >
              New itinerary
            </Link>
          </div>
          <ul className="mt-6 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
            {trips.map((trip) => (
              <li key={trip.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                    {trip.name}
                    {trip.active && <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">Open now</span>}
                    {trip.shared && <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Shared</span>}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {tripDates(trip)}
                    {trip.days > 0 && <> · {trip.days} {trip.days === 1 ? "day" : "days"}</>}
                    <> · {trip.stops} {trip.stops === 1 ? "stop" : "stops"}</>
                    {trip.places > 0 && <> · {trip.places} saved to plan</>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTrip(trip.id)}
                  disabled={opening !== null}
                  className="shrink-0 border border-[var(--gold-light)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-deep)] disabled:opacity-50"
                >
                  {opening === trip.id ? "Opening…" : trip.active ? "Open" : "Switch to it"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Your saved route</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{activeRoute.length ? "Ready to plan." : "Nothing saved yet."}</h2>
          </div>
          <Link href="/my-route" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Open My Route</Link>
        </div>
        {activeRoute.length > 0 && (
          <ul className="mt-6 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
            {activeRoute.slice(0, 4).map((place) => (
              <li key={place.id} className="py-4">
                <p className="font-[family-name:var(--font-display)] text-[var(--navy)]">{place.yiddishName && <span dir="rtl" className="block text-2xl leading-tight">{place.yiddishName}</span>}<span className="mt-1 block text-base text-stone-500">{place.name}</span></p>
                <p className="mt-1 text-sm text-stone-600">{place.address}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
