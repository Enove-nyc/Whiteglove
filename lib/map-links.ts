/**
 * Linking into the map, and out of it again.
 *
 * WHAT WAS MISSING. The map plots five kinds of thing at once — kevarim,
 * shuls, things to do, places to stay, airports — and there was no way to say
 * "just the shuls", and no way to arrive at it anywhere in particular. Every
 * visit started on the whole world with everything on it, and every other page
 * that knew exactly where somebody was looking could only offer a link to that
 * same cold start.
 *
 * THE URL CARRIES THE VIEW, so a map showing the batei hachaim within 25km of
 * Kraków can be linked to, bookmarked, sent to somebody, and reached with the
 * Back button. That is what makes it a view of a list rather than a second
 * website: the list page says where and what, and the map opens on it.
 *
 * PURE. The reading and the writing of the parameters live here together so
 * they cannot drift — a link builder in one file and a parser in another is how
 * a parameter quietly stops being read.
 */

import { pointFrom, type Point } from "@/lib/map-markers";

/** The kinds the map plots. Same strings the markers carry. */
export const MAP_KINDS = ["kever", "shul", "attraction", "stay", "airport"] as const;
export type MapKind = (typeof MAP_KINDS)[number];

export const MAP_KIND_LABEL: Record<MapKind, string> = {
  kever: "Batei hachaim",
  shul: "Shuls",
  attraction: "Things to do",
  stay: "Places to stay",
  airport: "Airports",
};

/** How far around a point, in km. The map offers these and no others. */
export const MAP_RADII = [10, 25, 50, 100, 200] as const;

export type MapView = {
  /** Where the map opens, or null for everything. */
  center: Point | null;
  /** What to call that place on screen. */
  name: string | null;
  radius: number;
  /** Which kinds to plot. Every kind when nothing was asked for. */
  kinds: MapKind[];
};

export const WHOLE_MAP: MapView = { center: null, name: null, radius: 50, kinds: [...MAP_KINDS] };

function isKind(value: string): value is MapKind {
  return (MAP_KINDS as readonly string[]).includes(value);
}

/**
 * A link to the map, showing one place and one set of kinds.
 *
 * Anything left out is left out of the URL rather than written as a default,
 * so a link says only what its author meant and the map's own defaults stay in
 * one place.
 */
export function mapHref(view: {
  at?: string | null;
  name?: string | null;
  radius?: number;
  kinds?: readonly MapKind[];
}): string {
  const params = new URLSearchParams();
  const point = pointFrom(view.at ?? undefined);
  if (point) params.set("at", `${point.lat},${point.lng}`);
  if (view.name?.trim()) params.set("name", view.name.trim());
  if (view.radius && (MAP_RADII as readonly number[]).includes(view.radius)) params.set("km", String(view.radius));
  // All five is the default and says nothing, so it is not written.
  if (view.kinds && view.kinds.length > 0 && view.kinds.length < MAP_KINDS.length) {
    params.set("kinds", [...view.kinds].join(","));
  }
  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

/**
 * The view a URL asks for.
 *
 * Anything unreadable falls back to the default rather than showing an empty
 * map: a link that has been mangled in an email should open the map, not a
 * blank one. An unrecognised kind is dropped, and a kinds list that leaves
 * nothing at all is treated as "no filter" for the same reason.
 */
export function readMapView(params: {
  at?: string | null;
  name?: string | null;
  km?: string | null;
  kinds?: string | null;
}): MapView {
  const center = pointFrom(params.at ?? undefined);
  const km = Number(params.km);
  const kinds = (params.kinds ?? "")
    .split(",")
    .map((kind) => kind.trim())
    .filter(isKind);

  return {
    center,
    name: center ? params.name?.trim() || null : null,
    radius: (MAP_RADII as readonly number[]).includes(km) ? km : WHOLE_MAP.radius,
    kinds: kinds.length > 0 ? [...new Set(kinds)] : [...MAP_KINDS],
  };
}
