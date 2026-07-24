"use client";

import { useState } from "react";
import type { SavedPlace } from "@/data/route-utils";

const routeKey = "whiteGloveMyRoute";

function readRoute() {
  try { return JSON.parse(localStorage.getItem(routeKey) || "[]") as SavedPlace[]; } catch { return []; }
}

export default function SaveTripItemButton({ item, label = "Add to My Route" }: { item: SavedPlace; label?: string }) {
  const [saved, setSaved] = useState(() => typeof window !== "undefined" && readRoute().some((place) => place.id === item.id));
  function save() {
    const current = readRoute();
    const next = saved ? current.filter((place) => place.id !== item.id) : [...current, item];
    localStorage.setItem(routeKey, JSON.stringify(next));
    window.dispatchEvent(new Event("whiteglove-route"));
    setSaved(!saved);
  }
  return <button type="button" onClick={save} className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] transition ${saved ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--gold)] text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}>{saved ? "Added to My Route" : label}</button>;
}
