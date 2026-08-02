/**
 * Airports and city groups the owner adds himself.
 *
 * The site knows a hundred airports and six city groups, and both are written
 * into data/airports.ts. That is right for the ones that will not change —
 * JFK is JFK — and wrong for the ones this site actually needs: a regional
 * strip an hour from a kever town, a field that only matters in Elul, a city
 * whose two airports should be searched together because nobody minds which.
 * Every one of those was a code change.
 *
 * SAME SHAPE AS THE BORDER CROSSINGS. data/airports.ts stays the built-in
 * list, untouched and readable; what the owner adds lives in its own store and
 * is merged on top. Nothing here edits the file, so a built-in airport cannot
 * be corrupted by the admin, and the merge is a pure function that can be
 * tested without either.
 *
 * A CITY GROUP IS THE SUBSTANTIVE PART. "New York — all airports" searching
 * JFK, EWR and LGA together is nearly always the question being asked, and it
 * is the thing that cannot be expressed by adding one airport at a time.
 */

import { AIRPORTS, type Airport, METRO_AREAS } from "@/data/airports";

/** An airport the owner added. Same fields the built-in list carries. */
export type AddedAirport = {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** Other names people search by — a town, a spelling, a kever. */
  aliases: string[];
  /** The city group this belongs to, when it is in one. */
  cityCode?: string;
  addedAt?: string;
};

/** A city group the owner added, or an addition to a built-in one. */
export type AddedMetro = {
  code: string;
  label: string;
  country: string;
  addedAt?: string;
};

export type AirportEdits = { airports: AddedAirport[]; metros: AddedMetro[] };

export const EMPTY_EDITS: AirportEdits = { airports: [], metros: [] };

const BUILT_IN_CODES = new Set(AIRPORTS.map((a) => a.code.toUpperCase()));
const BUILT_IN_METROS = new Set(Object.keys(METRO_AREAS).map((c) => c.toUpperCase()));

export const isBuiltInAirport = (code: string) => BUILT_IN_CODES.has(code.trim().toUpperCase());
export const isBuiltInMetro = (code: string) => BUILT_IN_METROS.has(code.trim().toUpperCase());

/**
 * The whole airport list: the built-in one with the owner's on top.
 *
 * An added airport whose code matches a built-in one REPLACES it rather than
 * appearing twice — that is how a wrong coordinate or a missing alias gets
 * corrected without editing the file. Two entries for JFK would be worse than
 * either of them alone: the picker would offer both and the traveller would
 * have to guess.
 */
export function mergeAirports(added: AddedAirport[]): Airport[] {
  const byCode = new Map<string, Airport>();
  for (const airport of AIRPORTS) byCode.set(airport.code.toUpperCase(), airport);
  for (const extra of added) {
    const code = extra.code.trim().toUpperCase();
    if (!code) continue;
    const existing = byCode.get(code);
    byCode.set(code, {
      // Anything the owner did not fill in keeps whatever the built-in had, so
      // correcting one coordinate does not blank the aliases.
      ...(existing ?? { size: "regional" as const }),
      code,
      name: extra.name.trim() || existing?.name || code,
      city: extra.city.trim() || existing?.city || "",
      country: extra.country.trim() || existing?.country || "",
      lat: Number.isFinite(extra.lat) ? extra.lat : (existing?.lat ?? 0),
      lng: Number.isFinite(extra.lng) ? extra.lng : (existing?.lng ?? 0),
      aliases: extra.aliases.length ? extra.aliases : (existing?.aliases ?? []),
      cityCode: extra.cityCode?.trim().toUpperCase() || existing?.cityCode,
    } as Airport);
  }
  return [...byCode.values()];
}

/** Every city group, built-in and added. */
export function mergeMetros(added: AddedMetro[]): Record<string, { label: string; country: string }> {
  const all: Record<string, { label: string; country: string }> = { ...METRO_AREAS };
  for (const metro of added) {
    const code = metro.code.trim().toUpperCase();
    if (!code) continue;
    all[code] = { label: metro.label.trim() || all[code]?.label || code, country: metro.country.trim() || all[code]?.country || "" };
  }
  return all;
}

/** Which airports end up in a group, once everything is merged. */
export function airportsIn(code: string, airports: Airport[]): string[] {
  const want = code.trim().toUpperCase();
  return airports.filter((a) => a.cityCode?.toUpperCase() === want).map((a) => a.code);
}

/* ---- what can be saved -------------------------------------------------- */

const CODE = /^[A-Z]{3}$/;

/**
 * Why this airport cannot be saved, or null.
 *
 * The coordinate is required and is checked as a real place on earth. An
 * airport with no coordinate is one the planner cannot measure a driving time
 * to, so it would be added and then quietly do nothing.
 */
export function airportProblem(input: Partial<AddedAirport>): string | null {
  const code = (input.code ?? "").trim().toUpperCase();
  if (!CODE.test(code)) return "An airport code is three letters, like KRK.";
  if (!(input.name ?? "").trim()) return "Give it a name.";
  if (!(input.city ?? "").trim()) return "Say which city or town it serves.";
  if (!(input.country ?? "").trim()) return "Say which country it is in.";
  const { lat, lng } = input;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Give the coordinates. Without them the planner cannot work out a driving time to it.";
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return "Those coordinates are not a place on earth.";
  if (lat === 0 && lng === 0) return "0, 0 is in the Atlantic. Check the coordinates.";
  const city = (input.cityCode ?? "").trim().toUpperCase();
  if (city && !CODE.test(city)) return "A city group code is three letters, like NYC.";
  if (city === code) return "An airport cannot be its own city group.";
  return null;
}

/**
 * Why this city group cannot be saved, or null.
 *
 * `willHold` is how many airports would be in it. TWO IS THE MINIMUM, and not
 * as pedantry: a group is an offer to search several airports together, and
 * one that holds a single airport is a duplicate row in the picker saying the
 * same thing twice.
 */
export function metroProblem(input: Partial<AddedMetro>, willHold: number): string | null {
  const code = (input.code ?? "").trim().toUpperCase();
  if (!CODE.test(code)) return "A city group code is three letters, like NYC.";
  if (!(input.label ?? "").trim()) return "Give it a name — what a traveller should see, like “New York — all airports”.";
  if (!(input.country ?? "").trim()) return "Say which country it is in.";
  if (isBuiltInAirport(code)) return `${code} is already an airport. A group needs a code of its own.`;
  if (willHold < 2) {
    return "A city group needs at least two airports in it. Put the airports in the group first — one on its own is the same row twice.";
  }
  return null;
}

/**
 * What is worth saying about a group on the admin screen.
 *
 * Named rather than counted where it can be: "JFK, EWR and LGA" tells somebody
 * whether the group is right, and "3 airports" does not.
 */
export function describeMetro(code: string, airports: Airport[]): string {
  const inside = airportsIn(code, airports);
  if (inside.length === 0) return "Nothing is in this group yet, so it will not be offered.";
  if (inside.length === 1) return `Only ${inside[0]} is in it, so it will not be offered — a group needs two.`;
  return `Searches ${inside.slice(0, -1).join(", ")} and ${inside.at(-1)} together.`;
}
