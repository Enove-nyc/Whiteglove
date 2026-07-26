"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SavedPlace } from "@/data/route-utils";

type AccountSnapshot = {
  email: string;
  route: SavedPlace[];
  favorites: SavedPlace[];
};

const read = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as SavedPlace[];
  } catch {
    return [];
  }
};

export default function AccountRoutePanel({ loggedIn = false }: { loggedIn?: boolean }) {
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  // Only read browser-local saves for the anonymous preview. When the user is
  // logged in, their account (server) is the single source of truth — otherwise
  // places saved while browsing anonymously would leak into a new account.
  const [route, setRoute] = useState<SavedPlace[]>(() => (loggedIn ? [] : read("whiteGloveMyRoute")));
  const [favorites, setFavorites] = useState<SavedPlace[]>(() => (loggedIn ? [] : read("whiteGloveFavorites")));

  useEffect(() => {
    const syncLocal = () => {
      setRoute(read("whiteGloveMyRoute"));
      setFavorites(read("whiteGloveFavorites"));
    };

    const syncRemote = async () => {
      const response = await fetch("/api/account/me");
      const data = await response.json().catch(() => null) as { account?: { email?: string }; data?: { route?: SavedPlace[]; favorites?: SavedPlace[] } | null } | null;
      if (data?.account?.email && data.data) {
        setAccount({
          email: data.account.email,
          route: data.data.route ?? [],
          favorites: data.data.favorites ?? [],
        });
      }
    };

    // Anonymous preview follows local storage; logged-in view follows the account.
    if (!loggedIn) {
      syncLocal();
      window.addEventListener("whiteglove-route", syncLocal);
    }
    syncRemote().catch(() => undefined);
    return () => window.removeEventListener("whiteglove-route", syncLocal);
  }, [loggedIn]);

  const activeRoute = loggedIn ? account?.route ?? [] : account?.route ?? route;
  const activeFavorites = loggedIn ? account?.favorites ?? [] : account?.favorites ?? favorites;
  const sourceLabel = account ? `Synced to ${account.email}` : loggedIn ? "Synced to your account" : "Saved in this browser";

  return (
    <>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
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
