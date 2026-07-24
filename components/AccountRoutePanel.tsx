"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SavedPlace } from "@/data/route-utils";

const read = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || "[]") as SavedPlace[]; } catch { return []; } };

export default function AccountRoutePanel() {
  const [route, setRoute] = useState<SavedPlace[]>(() => read("whiteGloveMyRoute"));
  const [favorites, setFavorites] = useState<SavedPlace[]>(() => read("whiteGloveFavorites"));

  useEffect(() => {
    const sync = () => { setRoute(read("whiteGloveMyRoute")); setFavorites(read("whiteGloveFavorites")); };
    window.addEventListener("whiteglove-route", sync);
    return () => window.removeEventListener("whiteglove-route", sync);
  }, []);

  return <><div className="mt-12 grid gap-5 md:grid-cols-3"><div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">My Route</p><p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{route.length}</p><p className="mt-3 leading-7 text-stone-600">Destinations in your active journey.</p></div><div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Favorites</p><p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{favorites.length}</p><p className="mt-3 leading-7 text-stone-600">Places saved for another time.</p></div><div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Private notes</p><p className="mt-4 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">0</p><p className="mt-3 leading-7 text-stone-600">Personal trip notes are coming next.</p></div></div><div className="mt-8 border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Your saved route</p><h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{route.length ? "Ready to plan." : "Nothing saved yet."}</h2></div><Link href="/my-route" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Open My Route</Link></div>{route.length > 0 && <ul className="mt-6 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">{route.slice(0, 4).map((place) => <li key={place.id} className="py-4"><p className="font-[family-name:var(--font-display)] text-[var(--navy)]">{place.yiddishName && <span dir="rtl" className="block text-2xl leading-tight">{place.yiddishName}</span>}<span className="mt-1 block text-base text-stone-500">{place.name}</span></p><p className="mt-1 text-sm text-stone-600">{place.address}</p></li>)}</ul>}</div></>;
}
