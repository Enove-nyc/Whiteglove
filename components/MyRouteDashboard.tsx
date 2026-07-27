"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { directionsUrl, optimizeRoute, type SavedPlace } from "@/data/route-utils";

type AccountSnapshot = {
  email: string;
  route: SavedPlace[];
  favorites: SavedPlace[];
};

const routeKey = "whiteGloveMyRoute";
const favoritesKey = "whiteGloveFavorites";
const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as SavedPlace[];
  } catch {
    return [];
  }
};

export default function MyRouteDashboard() {
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [route, setRoute] = useState<SavedPlace[]>([]);
  const [favorites, setFavorites] = useState<SavedPlace[]>([]);

  useEffect(() => {
    const syncLocal = () => {
      setRoute(read(routeKey));
      setFavorites(read(favoritesKey));
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

    syncLocal();
    syncRemote().catch(() => undefined);
    window.addEventListener("whiteglove-route", syncLocal);
    return () => window.removeEventListener("whiteglove-route", syncLocal);
  }, []);

  const activeRoute = account?.route ?? route;
  const activeFavorites = account?.favorites ?? favorites;
  const optimized = optimizeRoute(activeRoute);
  const openDirections = () => {
    const url = directionsUrl(optimized);
    if (url) window.open(url, "_blank", "noreferrer");
  };

  const remove = (id: string) => {
    const next = activeRoute.filter((place) => place.id !== id);
    localStorage.setItem(routeKey, JSON.stringify(next));
    window.dispatchEvent(new Event("whiteglove-route"));
    void fetch("/api/account/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "route", action: "replace", items: next }),
    });
  };

  const setPlannedDate = (id: string, plannedDate: string) => {
    const next = activeRoute.map((place) => (place.id === id ? { ...place, plannedDate } : place));
    localStorage.setItem(routeKey, JSON.stringify(next));
    window.dispatchEvent(new Event("whiteglove-route"));
    void fetch("/api/account/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "route", action: "replace", items: next }),
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">My Route</p>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Your journey, arranged with care.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Save the places that matter to you, set any kever you must reach on a specific date, then organize the flexible stops around it.</p>

      {activeRoute.length === 0 ? (
        <div className="mt-12 border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Your route is waiting.</h2>
          <p className="mt-3 leading-7 text-stone-600">Open a destination or location and choose Add to My Route.</p>
          <Link href="/stops" className="mt-6 inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white">Browse destinations</Link>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_.6fr]">
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7 sm:p-9">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Saved places</p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">My Route</h2>
              </div>
              <span className="text-sm text-stone-500">{activeRoute.length} places</span>
            </div>
            <ol className="mt-7 space-y-4">
              {optimized.map((place, index) => (
                <li key={place.id} className="flex items-start gap-4 border-t border-[var(--gold-light)] pt-4 first:border-t-0 first:pt-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{place.name}{place.yiddishName && <span className="ml-2 text-lg text-stone-500">{place.yiddishName}</span>}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{place.address}</p>
                    <label className="mt-3 flex max-w-xs items-center gap-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--gold)]">Fixed date<input type="date" value={place.plannedDate ?? ""} onChange={(event) => setPlannedDate(place.id, event.target.value)} className="border border-[var(--gold-light)] bg-white px-2 py-1 text-sm font-normal tracking-normal text-[var(--navy)]" /></label>
                    {place.plannedDate && <p className="mt-2 text-xs font-semibold text-[var(--navy)]">This stop is held in place for {place.plannedDate}.</p>}
                  </div>
                  <button onClick={() => remove(place.id)} className="text-xs font-bold uppercase tracking-[0.1em] text-stone-500 hover:text-[var(--navy)]">Remove</button>
                </li>
              ))}
            </ol>
          </div>
          <aside className="border border-[var(--gold-light)] bg-[var(--cream-deep)] p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Route helper</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Optimize the flexible stops.</h2>
            <p className="mt-4 leading-7 text-stone-600">A place with a fixed date stays in its place. The other kevarim are ordered by nearby distance within the flexible parts of your route. Places without coordinates remain at the end until we verify them.</p>
            <button type="button" disabled={activeRoute.length < 2} onClick={openDirections} className="mt-7 w-full bg-[var(--navy)] px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50">Open optimized route in maps</button>
            <Link href="/itinerary" className="mt-3 block w-full border border-[var(--gold)] px-5 py-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Build a full day-by-day itinerary →</Link>
          </aside>
        </div>
      )}

      <div className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Favorites - {activeFavorites.length}</p>
        <p className="mt-3 text-stone-600">Favorites are saved separately from your active route, so you can keep places for a future trip.</p>
      </div>
    </section>
  );
}
