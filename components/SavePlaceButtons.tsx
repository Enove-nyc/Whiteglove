"use client";

import Link from "next/link";
import { useState } from "react";
import type { SavedPlace } from "@/data/route-utils";
import { signInHref, useSignedIn } from "@/lib/use-signed-in";

// Adding a place to your route, or keeping it as a favourite.
//
// Both need an account. They were writing to the browser's own storage and
// then telling the account about it, which meant a signed-out visitor got a
// button that said "Added to My Route" while the request behind it came back
// 401 and nothing was kept. The route looked saved, survived a refresh on that
// one browser, and was gone the moment they opened the site on their phone.
//
// So the buttons now ask to sign in instead of pretending. Nothing is written
// locally either — a route that exists in one browser and nowhere else is the
// thing that misled them in the first place.

const routeKey = "whiteGloveMyRoute";
const favoritesKey = "whiteGloveFavorites";

function read(key: string): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as SavedPlace[];
  } catch {
    return [];
  }
}

function write(key: string, places: SavedPlace[]) {
  localStorage.setItem(key, JSON.stringify(places));
  window.dispatchEvent(new Event("whiteglove-route"));
}

export default function SavePlaceButtons({ place }: { place: SavedPlace }) {
  const signedIn = useSignedIn();
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
    write(key, next);
    setActive(!active);
    void syncAccount(collection);
  };

  // Still asking. Showing nothing for a moment beats flashing "sign in" at
  // somebody who is already signed in.
  if (signedIn === null) return <div className="mt-6 h-[38px]" aria-hidden="true" />;

  if (!signedIn) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href={signInHref()}
          className="border border-[var(--navy)] bg-[var(--navy)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          Sign in to add to My Route
        </Link>
        <p className="text-sm leading-6 text-stone-600">
          A route is kept in your account, so it is there on your phone when you are standing at the gate — not only in
          this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle(routeKey, inRoute, setInRoute, "route")}
        className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${inRoute ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
      >
        {inRoute ? "Added to My Route" : "Add to My Route"}
      </button>
      <button
        type="button"
        onClick={() => toggle(favoritesKey, favorite, setFavorite, "favorites")}
        className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${favorite ? "border-[var(--gold)] bg-[var(--gold)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
      >
        {favorite ? "Saved to Favorites" : "Save favorite"}
      </button>
    </div>
  );
}
