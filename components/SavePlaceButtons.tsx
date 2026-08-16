"use client";

import { useState } from "react";
import type { SavedPlace } from "@/data/route-utils";
import { useRequireSignIn } from "@/components/SignInGate";
import { useSignedIn } from "@/lib/use-signed-in";

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
//
// PRESSED SIGNED OUT, THE BUTTON OPENS THE SIGN-IN DIALOG RATHER THAN SENDING
// somebody to /login and losing the place they were adding. It resumes the
// exact toggle the moment sign-in succeeds — see components/SignInGate.tsx.

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
  const requireSignIn = useRequireSignIn();
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

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => requireSignIn(() => toggle(routeKey, inRoute, setInRoute, "route"), "Sign in to add to Route")}
        className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${inRoute ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
      >
        {inRoute ? "Added to Route" : "Add to Route"}
      </button>
      <button
        type="button"
        onClick={() => requireSignIn(() => toggle(favoritesKey, favorite, setFavorite, "favorites"), "Sign in to save")}
        className={`border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${favorite ? "border-[var(--gold)] bg-[var(--gold)] text-white" : "border-[var(--gold-light)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
      >
        {favorite ? "Saved to Favorites" : "Save favorite"}
      </button>
    </div>
  );
}
