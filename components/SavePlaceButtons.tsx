"use client";

import { useState } from "react";
import type { SavedPlace } from "@/data/route-utils";

const routeKey = "whiteGloveMyRoute";
const favoritesKey = "whiteGloveFavorites";

function read(key: string): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]") as SavedPlace[]; } catch { return []; }
}

function write(key: string, places: SavedPlace[]) {
  localStorage.setItem(key, JSON.stringify(places));
  window.dispatchEvent(new Event("whiteglove-route"));
}

export default function SavePlaceButtons({ place }: { place: SavedPlace }) {
  const [inRoute, setInRoute] = useState(() => read(routeKey).some((item) => item.id === place.id));
  const [favorite, setFavorite] = useState(() => read(favoritesKey).some((item) => item.id === place.id));
  const syncAccount = async (collection: "route" | "favorites") => {
    await fetch("/api/account/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection, action: "toggle", place }),
    });
  };
  const toggle = (key: string, active: boolean, setActive: (value: boolean) => void, collection: "route" | "favorites") => {
    const next = active ? read(key).filter((item) => item.id !== place.id) : [...read(key), place];
    write(key, next); setActive(!active);
    void syncAccount(collection);
  };
  return <div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={() => toggle(routeKey, inRoute, setInRoute, "route")} className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${inRoute ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}>{inRoute ? "Added to My Route" : "Add to My Route"}</button><button type="button" onClick={() => toggle(favoritesKey, favorite, setFavorite, "favorites")} className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${favorite ? "border-[var(--gold)] bg-[var(--gold)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}>{favorite ? "Saved to Favorites" : "Save favorite"}</button></div>;
}
