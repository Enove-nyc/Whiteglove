"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as L from "leaflet";
import { lookupKosherPlaces, type KosherPlace } from "@/lib/kosher-osm";
import { placeDirectionsUrl } from "@/data/route-utils";
import CompassMark from "@/components/CompassMark";
import { compassFor, MAP_STYLE, TOGGLEABLE_KINDS } from "@/lib/map-icons";
import { boundsOf, countByKind, type MapKind, type MapMarker } from "@/lib/map-markers";
import {
  googleMaps,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
  type GInfoWindow,
  type GMap,
  type GMarker,
} from "@/lib/google-maps-loader";

// What is around a place, on a map.
//
// The map is Google's — the same map people already navigate by, so a kever
// pinned here sits where they expect it to. That needs a browser key
// (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY, restricted to the Maps JavaScript API
// and to this site's hostnames; see lib/google-maps-loader.ts). Without one,
// or if Google's script cannot be reached, it draws the OpenStreetMap map
// instead rather than showing an empty box — a fallback map beats no map.
//
// What is plotted does not change either way. Kevarim, things to do and places
// to stay come from our own content; kosher places come live from OSM through
// Overpass, the same source the kosher finder uses. We plot what those sources
// actually contain and nothing else.
//
// A NULL CENTRE means nobody has searched yet. The map then frames everything
// it holds rather than opening on one town somebody has to already know to
// look for.

export type { MapMarker } from "@/lib/map-markers";

/** One shared empty list, so "no results" is the same object every render. */
const EMPTY_PLACES: KosherPlace[] = [];

function escapeHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The card shown when a pin is tapped. Identical on either map. */
function popupHtml(m: MapMarker, centerName: string | null) {
  return [
    `<strong style="font-size:14px;color:#172d52">${escapeHtml(m.name)}</strong>`,
    // The kind is named in words. Six colours of the same compass is not
    // something everybody can tell apart, so the popup says which it is.
    `<div style="color:${MAP_STYLE[m.kind].color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(MAP_STYLE[m.kind].label)}</div>`,
    m.subtitle ? `<div style="color:#78716c;font-size:12px">${escapeHtml(m.subtitle)}</div>` : "",
    m.address ? `<div style="margin-top:4px;font-size:12px">${escapeHtml(m.address)}</div>` : "",
    typeof m.km === "number" && centerName ? `<div style="margin-top:4px;font-size:12px;color:#78716c">${m.km.toFixed(1)} km from ${escapeHtml(centerName)}</div>` : "",
    `<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
       <a href="${escapeHtml(placeDirectionsUrl(m.address, `${m.lat}, ${m.lng}`))}" target="_blank" rel="noreferrer" style="font-weight:700;color:#172d52">Navigate &rarr;</a>
       ${m.href ? `<a href="${escapeHtml(m.href)}" style="font-weight:700;color:#172d52">Open page &rarr;</a>` : ""}
       ${m.phone ? `<a href="tel:${escapeHtml(m.phone.replace(/[^\d+]/g, ""))}" style="font-weight:700;color:#172d52">${escapeHtml(m.phone)}</a>` : ""}
     </div>`,
  ].filter(Boolean).join("");
}

export default function AreaMap({
  center,
  centerName,
  markers,
  radiusKm = 25,
  loadKosher = true,
  height = 460,
}: {
  /** Null until somebody searches: the map then frames everything instead. */
  center: { lat: number; lng: number } | null;
  centerName: string | null;
  markers: MapMarker[];
  radiusKm?: number;
  loadKosher?: boolean;
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.LayerGroup>>({});
  // Google's map, when there is a browser key for it.
  const gmapRef = useRef<GMap | null>(null);
  const gmarkersRef = useRef<GMarker[]>([]);
  const ginfoRef = useRef<GInfoWindow | null>(null);
  const [engine, setEngine] = useState<"deciding" | "google" | "osm">("deciding");
  // How far in the map is, so pins can shrink when hundreds of them are on
  // screen at once. Written from the map's own zoom event — an external system
  // telling us it changed, which is what an effect subscribes to.
  const [zoom, setZoom] = useState(11);
  // One piece of state, tagged with the request it answers, rather than a list
  // and a status that can disagree. Everything else about the lookup — whether
  // it is in flight, whether it failed, whether these results are still the
  // right ones — is read off it.
  const [answer, setAnswer] = useState<{ key: string; places: KosherPlace[]; failed: boolean } | null>(null);
  const [shown, setShown] = useState<Record<MapKind, boolean>>({
    center: true, kever: true, attraction: true, stay: true, kosher: true, airport: true,
  });

  // Only around a searched place: Overpass is asked what is near a point, and
  // "everywhere" is not a point.
  const kosherLive = Boolean(center) && loadKosher;
  const request = center ? `${center.lat},${center.lng},${radiusKm}` : "";
  const answered = Boolean(answer && answer.key === request);
  // Derived, so a new search reads "looking…" on the very first render rather
  // than after an effect has run and set a flag.
  const kosherState: "idle" | "loading" | "done" | "failed" = !kosherLive
    ? "idle"
    : !answered
      ? "loading"
      : answer!.failed
        ? "failed"
        : "done";
  const kosher = useMemo(
    () => (answered && answer && !answer.failed ? answer.places : EMPTY_PLACES),
    [answered, answer],
  );

  const kosherMarkers: MapMarker[] = useMemo(
    () =>
      kosher.map((p) => ({
        id: `kosher-${p.id}`,
        name: p.name,
        subtitle: [p.category, p.kosherTag ? `kosher: ${p.kosherTag}` : ""].filter(Boolean).join(" · "),
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        phone: p.phone,
        km: p.km,
        kind: "kosher" as const,
      })),
    [kosher],
  );

  const all = useMemo(() => [...markers, ...kosherMarkers], [markers, kosherMarkers]);

  // Which map to draw.
  //
  // Google's if there is a browser key and its script becomes usable;
  // OpenStreetMap otherwise. Auth failures after the script loads (wrong
  // referrer, billing off, API not enabled) also fall through to OSM rather
  // than leaving a blank Google box. Decided once on mount — a late auth
  // refusal is the one exception that may swap Google → OSM.
  useEffect(() => {
    let cancelled = false;
    let authOff: (() => void) | undefined;

    async function drawOsm() {
      if (cancelled || !boxRef.current || mapRef.current) return;
      // Clear a Google attempt that was refused after construct.
      for (const marker of gmarkersRef.current) marker.setMap(null);
      gmarkersRef.current = [];
      gmapRef.current = null;
      ginfoRef.current = null;
      if (boxRef.current) boxRef.current.innerHTML = "";

      // Leaflet touches window on import, so it can only be loaded in the browser.
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || mapRef.current) return;
      const map = leaflet.map(boxRef.current, { scrollWheelZoom: false, attributionControl: true }).setView([48, 14], 4);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);
      // Scroll-zoom is off so the page still scrolls on a phone; a click enables it.
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("zoomend", () => setZoom(map.getZoom()));
      mapRef.current = map;
      for (const kind of Object.keys(MAP_STYLE)) layersRef.current[kind] = leaflet.layerGroup().addTo(map);
      setEngine("osm");
    }

    async function drawGoogle(): Promise<boolean> {
      const maps = googleMaps();
      if (cancelled || !boxRef.current || !maps?.Map) return false;
      try {
        gmapRef.current = new maps.Map(boxRef.current, {
          // Somewhere over Europe until the framing effect below runs, which
          // it does on the first paint. Never shown as a resting position.
          center: { lat: 48, lng: 14 },
          zoom: 4,
          // Off so the page still scrolls past the map on a phone; holding
          // ctrl (or two fingers) zooms, which is Google's own convention.
          gestureHandling: "cooperative",
          mapTypeControl: true,
          // Positions keep Google's chrome inside the box — TOP_RIGHT /
          // RIGHT_BOTTOM sat flush against the edge and the compass / zoom
          // controls were clipped by the border.
          mapTypeControlOptions: { position: 1 }, // TOP_LEFT
          streetViewControl: false,
          fullscreenControl: true,
          fullscreenControlOptions: { position: 3 }, // TOP_RIGHT
          zoomControl: true,
          zoomControlOptions: { position: 9 }, // RIGHT_BOTTOM
        });
        ginfoRef.current = new maps.InfoWindow();
        gmapRef.current.addListener?.("zoom_changed", () => setZoom(gmapRef.current?.getZoom?.() ?? 11));
        setEngine("google");
        return true;
      } catch {
        gmapRef.current = null;
        ginfoRef.current = null;
        return false;
      }
    }

    (async () => {
      authOff = onGoogleMapsAuthFailure(() => {
        if (!cancelled) void drawOsm();
      });

      const useGoogle = await loadGoogleMaps();
      if (cancelled || !boxRef.current) return;

      // loadGoogleMaps can briefly report false while Map is already on the
      // window after a bootstrap race — prefer Google whenever Map exists.
      if ((useGoogle || googleMaps()?.Map) && (await drawGoogle())) return;

      await drawOsm();
    })();
    return () => {
      cancelled = true;
      authOff?.();
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = {};
      for (const marker of gmarkersRef.current) marker.setMap(null);
      gmarkersRef.current = [];
      gmapRef.current = null;
    };
    // Once, on mount. The engine must not be swapped underneath somebody
    // mid-look for ordinary reasons; auth refusal is handled above.
  }, []);

  // Where the map looks.
  //
  // On a search, at the place searched for. With no search, framed around
  // everything that is plotted — which is what makes the map open on the whole
  // content rather than on one town chosen in the source code.
  const visible = useMemo(() => all.filter((m) => shown[m.kind]), [all, shown]);
  const frame = useMemo(() => boundsOf(visible.length ? visible : all), [visible, all]);

  useEffect(() => {
    if (engine === "deciding") return;
    if (center) {
      mapRef.current?.setView([center.lat, center.lng], 11);
      gmapRef.current?.setCenter({ lat: center.lat, lng: center.lng });
      gmapRef.current?.setZoom(11);
      return;
    }
    if (!frame) return;
    if (gmapRef.current) {
      const maps = googleMaps();
      if (maps) {
        const bounds = new maps.LatLngBounds();
        bounds.extend({ lat: frame.north, lng: frame.east });
        bounds.extend({ lat: frame.south, lng: frame.west });
        // Extra inset so the edge pins and Google's own controls are not cut
        // off by the map box border.
        gmapRef.current.fitBounds(bounds, 56);
      }
      return;
    }
    // Nothing sets the zoom here. Moving the map makes it fire its own zoom
    // event, and that is what reports the new value — the map is the external
    // system, and asking it to tell us beats guessing what it did.
    mapRef.current?.fitBounds([[frame.south, frame.west], [frame.north, frame.east]], { padding: [56, 56] });
    // Deliberately keyed on the search and the engine only: reframing every
    // time a category is switched off would jump the map under the cursor.
  }, [center, frame, engine]);

  // Draw the markers on whichever map was chosen.
  useEffect(() => {
    if (engine === "deciding") return;
    let cancelled = false;

    if (engine === "google") {
      const maps = googleMaps();
      const map = gmapRef.current;
      if (!maps || !map) return;
      for (const marker of gmarkersRef.current) marker.setMap(null);
      gmarkersRef.current = [];

      for (const m of visible) {
        const pin = compassFor(m.kind, zoom);
        const marker = new maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.name,
          // The logo mark (hand + compass) on a cream disc — same PNG the
          // legend below the map shows. Anchored at the cuff, not the centre.
          icon: {
            url: pin.url,
            scaledSize: new maps.Size(pin.width, pin.height),
            anchor: new maps.Point(pin.anchorX, pin.anchorY),
          },
        });
        marker.addListener("click", () => {
          ginfoRef.current?.setContent(popupHtml(m, centerName));
          ginfoRef.current?.open({ map, anchor: marker });
        });
        gmarkersRef.current.push(marker);
      }
      return;
    }

    const map = mapRef.current;
    if (!map) return;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      for (const group of Object.values(layersRef.current)) group.clearLayers();

      for (const m of visible) {
        const pin = compassFor(m.kind, zoom);
        const icon = leaflet.icon({
          iconUrl: pin.url,
          iconSize: [pin.width, pin.height],
          iconAnchor: [pin.anchorX, pin.anchorY],
          popupAnchor: [0, -pin.anchorY],
        });
        const dot = leaflet.marker([m.lat, m.lng], { icon, title: m.name });
        dot.bindPopup(popupHtml(m, centerName));
        dot.addTo(layersRef.current[m.kind]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, centerName, engine, zoom]);

  // Kosher places come from Overpass and can be slow, so they load after the
  // map. The effect only starts the lookup and records what came back — the
  // state is written in the callback, where an external system answering is
  // exactly what an effect is for.
  useEffect(() => {
    if (!kosherLive || !center) return;
    let cancelled = false;
    lookupKosherPlaces({ lat: center.lat, lng: center.lng }, radiusKm)
      .then((result) => {
        if (!cancelled) setAnswer({ key: request, places: result.places, failed: !result.reached });
      })
      .catch(() => {
        if (!cancelled) setAnswer({ key: request, places: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [center, radiusKm, kosherLive, request]);

  const counts = useMemo(() => countByKind(all), [all]);
  const total = useMemo(() => all.filter((m) => m.kind !== "center").length, [all]);
  const where = centerName ? `within ${radiusKm} km of ${centerName}` : "on the map";

  return (
    <div>
      {/* The answer to "how much is there", in words, before the filters. The
          counts on the buttons below are the same numbers, but a row of
          filters reads as controls rather than as an answer. */}
      <p className="text-sm leading-6 text-[var(--navy)]">
        <strong className="font-[family-name:var(--font-display)] text-2xl">{total}</strong>{" "}
        {total === 1 ? "place" : "places"} {where}
        {centerName && counts.kosher > 0 && <span className="text-stone-500"> — including {counts.kosher} kosher {counts.kosher === 1 ? "place" : "places"} listed on OpenStreetMap</span>}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {TOGGLEABLE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setShown((s) => ({ ...s, [kind]: !s[kind] }))}
            aria-pressed={shown[kind]}
            className={`inline-flex min-h-11 items-center gap-2 border px-3 text-[11px] font-bold uppercase tracking-[0.1em] transition ${
              shown[kind] ? "border-[var(--navy)] text-[var(--navy)]" : "border-[var(--gold-light)] text-stone-400 line-through decoration-1"
            }`}
          >
            {/* On and off are told apart three ways — the tick, the
                strikethrough and aria-pressed — not by the colour of the mark,
                which is exactly what somebody colour-blind cannot read. */}
            <span aria-hidden="true" className="w-2.5 text-center">{shown[kind] ? "✓" : "×"}</span>
            {/* The same glove mark the pins use, so the legend cannot drift. */}
            <CompassMark kind={kind} muted={!shown[kind]} />
            {MAP_STYLE[kind].label}
            <span className="font-normal text-stone-400">{counts[kind]}</span>
          </button>
        ))}
        {kosherLive && kosherState === "loading" && <span className="text-xs text-stone-500">Looking for kosher places…</span>}
        {kosherLive && kosherState === "failed" && (
          <span className="text-xs text-amber-800">
            OpenStreetMap could not be reached, so the kosher count is not an answer about this place.
          </span>
        )}
      </div>

      <div
        ref={boxRef}
        style={{ height }}
        className="wg-map-box mt-3 w-full border border-[var(--gold-light)] bg-[#eef2f5]"
        role="application"
        aria-label={centerName ? `Map of what is around ${centerName}` : "Map of everywhere on this site"}
      />

      <p className="mt-2 text-xs leading-5 text-stone-500">
        {engine === "deciding"
          ? "Loading the map… "
          : engine === "google"
            ? "Hold ctrl (or use two fingers) to zoom, so the page still scrolls past the map on a phone. "
            : "Scroll-zoom turns on once you click the map, so the page still scrolls past it on a phone. "}
        {center
          ? "Kevarim, things to do and places to stay are ours; kosher places come live from OpenStreetMap and its coverage varies by region — an empty map means OSM has nothing listed there, not that there is nothing there."
          : "Kosher food is looked up around a place, so search a town above to see it. Everything else is ours and is shown here."}
      </p>
    </div>
  );
}
