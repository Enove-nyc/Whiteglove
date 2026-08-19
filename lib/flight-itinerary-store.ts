/**
 * Where the owner's flight itineraries are kept.
 *
 * One JSON list under one key in the same private Upstash store as the site
 * notice and the rest of the owner-editable settings. It fails open the way
 * the eruvin store does: with no store connected, the list reads as empty and
 * a share link simply reports the itinerary is not available — never a crash.
 *
 * The customer-facing page finds an itinerary by reading the whole list and
 * matching its shareId. That is honest for the size of this — one owner
 * writing up the flights he sells — and needs no second key to keep in step
 * with the first.
 */

import { revalidatePath } from "next/cache";
import type { FlightItinerary } from "@/lib/flight-itinerary";

const KEY = "white-glove:flight-itineraries";

export function flightItineraryStoreAvailable(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

/** Never throws: an unreachable or unparseable store reads as no itineraries. */
async function read(): Promise<FlightItinerary[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as FlightItinerary[]) : [];
  } catch {
    return [];
  }
}

/**
 * Every saved itinerary, newest first. Read straight rather than cached: this
 * is an owner-only screen and a share link the owner has just sent, so a stale
 * read here would show him the wrong thing at the one moment it matters.
 */
export async function listFlightItineraries(): Promise<FlightItinerary[]> {
  return read();
}

/** One itinerary by its share address, or null if it is not there. */
export async function getFlightItineraryByShareId(shareId: string): Promise<FlightItinerary | null> {
  const id = shareId.trim();
  if (!id) return null;
  const list = await read();
  return list.find((item) => item.shareId === id) ?? null;
}

async function write(list: FlightItinerary[]): Promise<boolean> {
  if ((await redis(`set/${KEY}`, JSON.stringify(list))) === null) return false;
  revalidatePath("/admin/flight-itineraries");
  return true;
}

/** Save a new itinerary, newest first. False only when the store is unreachable. */
export async function addFlightItinerary(itinerary: FlightItinerary): Promise<boolean> {
  const list = await read();
  const next = [itinerary, ...list.filter((item) => item.id !== itinerary.id)];
  return write(next);
}

/** Remove one by id. Its share link stops working the moment this returns. */
export async function removeFlightItinerary(id: string): Promise<boolean> {
  const key = id.trim();
  if (!key) return false;
  const list = await read();
  const removed = list.find((item) => item.id === key);
  if (!(await write(list.filter((item) => item.id !== key)))) return false;
  if (removed) revalidatePath(`/f/${removed.shareId}`);
  return true;
}
