"use client";

import Link from "next/link";
import { useState } from "react";
import type { SavedPlace } from "@/data/route-utils";
import { signInHref, useSignedIn } from "@/lib/use-signed-in";

// The same rule as SavePlaceButtons: a route belongs to an account.
//
// Signed out, this used to write to the browser and then send the whole route
// to an endpoint that answered 401 — so the button said "Added to My Route"
// while nothing was kept anywhere it could be got back from.

const routeKey = "whiteGloveMyRoute";

function readRoute() {
  try {
    return JSON.parse(localStorage.getItem(routeKey) || "[]") as SavedPlace[];
  } catch {
    return [];
  }
}

export default function SaveTripItemButton({ item, label = "Add to My Route" }: { item: SavedPlace; label?: string }) {
  const signedIn = useSignedIn();
  const [saved, setSaved] = useState(() => typeof window !== "undefined" && readRoute().some((place) => place.id === item.id));

  async function save() {
    const current = readRoute();
    const next = saved ? current.filter((place) => place.id !== item.id) : [...current, item];
    localStorage.setItem(routeKey, JSON.stringify(next));
    window.dispatchEvent(new Event("whiteglove-route"));
    setSaved(!saved);
    await fetch("/api/account/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collection: "route", action: "replace", items: next }),
    });
  }

  // Still asking — hold the space rather than flash the wrong button.
  if (signedIn === null) return <span className="inline-block h-11 w-[170px]" aria-hidden="true" />;

  if (!signedIn) {
    return (
      <Link
        href={signInHref()}
        className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
      >
        Sign in to add
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={save}
      className={`inline-flex min-h-11 items-center border px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition ${saved ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
    >
      {saved ? "Added to My Route" : label}
    </button>
  );
}
