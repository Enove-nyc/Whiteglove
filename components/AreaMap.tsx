"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as L from "leaflet";
import { fetchKosherPlaces, type KosherPlace } from "@/lib/kosher-osm";
import { placeDirectionsUrl } from "@/data/route-utils";
import { googleMaps, loadGoogleMaps, type GInfoWindow, type GMap, type GMarker } from "@/lib/google-maps-loader";

// What is around a place, on a map.
//
// The map is Google's — the same map people already navigate by, so a kever
// pinned here sits where they expect it to. That needs a browser key
// (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY, restricted to the Maps JavaScript API
// and to this site's hostnames; see lib/google-maps-loader.ts). Without one,
// or if Google's script cannot be reached, it draws the OpenStreetMap map
// instead rather than showing an empty box — a fallback map beats no map.
//
// What is plotted does not change either way. Kevarim come from our own
// database; kosher places come live from OSM through Overpass, the same source
// the kosher finder uses. We plot what those sources actually contain and
// nothing else.

export type MapMarker = {
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lng: number;
  href?: string;
  address?: string;
  phone?: string;
  km?: number;
  kind: "center" | "kever" | "kosher" | "airport";
};

const STYLE: Record<MapMarker["kind"], { color: string; label: string; ring: number }> = {
  center: { color: "#172d52", label: "This place", ring: 11 },
  kever: { color: "#aa8b52", label: "Kevarim", ring: 8 },
  kosher: { color: "#2f7d54", label: "Kosher food", ring: 7 },
  airport: { color: "#7a6a92", label: "Airports", ring: 7 },
};

function escapeHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


/** The card shown when a pin is tapped. Identical on either map. */
function popupHtml(m: MapMarker, centerName: string) {
  return [
    `<strong style="font-size:14px;color:#172d52">${escapeHtml(m.name)}</strong>`,
    m.subtitle ? `<div style="color:#78716c;font-size:12px">${escapeHtml(m.subtitle)}</div>` : "",
    m.address ? `<div style="margin-top:4px;font-size:12px">${escapeHtml(m.address)}</div>` : "",
    typeof m.km === "number" ? `<div style="margin-top:4px;font-size:12px;color:#78716c">${m.km.toFixed(1)} km from ${escapeHtml(centerName)}</div>` : "",
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
  center: { lat: number; lng: number };
  centerName: string;
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
  const [kosher, setKosher] = useState<KosherPlace[]>([]);
  const [kosherState, setKosherState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [shown, setShown] = useState<Record<MapMarker["kind"], boolean>>({ center: true, kever: true, kosher: true, airport: true });

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
  // Google's if there is a browser key and its script loads; OpenStreetMap
  // otherwise. Decided once, on mount, and never swapped underneath a visitor
  // mid-look.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const useGoogle = await loadGoogleMaps();
      if (cancelled || !boxRef.current) return;

      if (useGoogle) {
        const maps = googleMaps();
        if (maps) {
          gmapRef.current = new maps.Map(boxRef.current, {
            center: { lat: center.lat, lng: center.lng },
            zoom: 11,
            // Off so the page still scrolls past the map on a phone; holding
            // ctrl (or two fingers) zooms, which is Google's own convention.
            gestureHandling: "cooperative",
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          });
          ginfoRef.current = new maps.InfoWindow();
          setEngine("google");
          return;
        }
      }

      // Leaflet touches window on import, so it can only be loaded in the browser.
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || mapRef.current) return;
      const map = leaflet.map(boxRef.current, { scrollWheelZoom: false, attributionControl: true }).setView([center.lat, center.lng], 11);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);
      // Scroll-zoom is off so the page still scrolls on a phone; a click enables it.
      map.on("click", () => map.scrollWheelZoom.enable());
      mapRef.current = map;
      for (const kind of Object.keys(STYLE)) layersRef.current[kind] = leaflet.layerGroup().addTo(map);
      setEngine("osm");
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = {};
      for (const marker of gmarkersRef.current) marker.setMap(null);
      gmarkersRef.current = [];
      gmapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-centre when the searched place changes.
  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], 11);
    gmapRef.current?.setCenter({ lat: center.lat, lng: center.lng });
    gmapRef.current?.setZoom(11);
  }, [center.lat, center.lng, engine]);

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

      for (const m of all) {
        if (!shown[m.kind]) continue;
        const style = STYLE[m.kind];
        // A plain circle symbol rather than a pin: the same dot the legend
        // above uses, so the colours mean the same thing in both places.
        const marker = new maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.name,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: style.ring,
            fillColor: style.color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
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

      for (const m of all) {
        if (!shown[m.kind]) continue;
        const style = STYLE[m.kind];
        const dot = leaflet.circleMarker([m.lat, m.lng], {
          radius: style.ring,
          color: "#fff",
          weight: 2,
          fillColor: style.color,
          fillOpacity: 1,
        });
        dot.bindPopup(popupHtml(m, centerName));
        dot.addTo(layersRef.current[m.kind]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [all, shown, centerName, engine]);

  // Kosher places come from Overpass and can be slow, so they load after the map.
  useEffect(() => {
    if (!loadKosher) return;
    let cancelled = false;
    setKosherState("loading");
    fetchKosherPlaces({ lat: center.lat, lng: center.lng }, radiusKm)
      .then((places) => {
        if (cancelled) return;
        setKosher(places);
        setKosherState("done");
      })
      .catch(() => {
        if (!cancelled) setKosherState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, radiusKm, loadKosher]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of all) c[m.kind] = (c[m.kind] ?? 0) + 1;
    return c;
  }, [all]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(STYLE) as Array<MapMarker["kind"]>)
          .filter((kind) => kind !== "center")
          .map((kind) => (
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
                  strikethrough and aria-pressed — not by the colour of a dot,
                  which is exactly the marker somebody colour-blind cannot
                  read. */}
              <span aria-hidden="true" className="w-2.5 text-center">{shown[kind] ? "\u2713" : "\u00d7"}</span>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: shown[kind] ? STYLE[kind].color : "#d6d3d1" }} />
              {STYLE[kind].label}
              <span className="font-normal text-stone-400">{counts[kind] ?? 0}</span>
            </button>
          ))}
        {kosherState === "loading" && <span className="text-xs text-stone-500">Looking for kosher places…</span>}
        {kosherState === "failed" && <span className="text-xs text-amber-800">Kosher lookup unavailable just now.</span>}
      </div>

      <div
        ref={boxRef}
        style={{ height }}
        className="mt-3 w-full border border-[var(--gold-light)] bg-[#eef2f5]"
        role="application"
        aria-label={`Map of what is around ${centerName}`}
      />

      <p className="mt-2 text-xs leading-5 text-stone-500">
        {engine === "google"
          ? "Hold ctrl (or use two fingers) to zoom, so the page still scrolls past the map on a phone. "
          : "Scroll-zoom turns on once you click the map, so the page still scrolls past it on a phone. "}
        Kevarim are ours; kosher places come live from OpenStreetMap and its coverage varies by region — an empty map
        means OSM has nothing listed there, not that there is nothing there.
      </p>
    </div>
  );
}
