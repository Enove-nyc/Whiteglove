"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as L from "leaflet";
import { placeDirectionsUrl } from "@/data/route-utils";
import CompassMark from "@/components/CompassMark";
import { curatedKosherPlaces, curatedKosherPlacesNear, type CuratedKosherPlaceNearby } from "@/lib/curated-kosher";
import { GLOVE_MARK_SRC, markPinFor, MAP_STYLE, TOGGLEABLE_KINDS } from "@/lib/map-icons";
import { tintedMarkUrl } from "@/lib/tinted-mark";
import { boundsOf, type MapKind, type MapMarker } from "@/lib/map-markers";
import {
  detachMarker,
  googleMaps,
  googleMapsMapId,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
  type GInfoWindow,
  type GMap,
  type GAnyMarker,
} from "@/lib/google-maps-loader";

// What is around a place, on a map.
//
// Google Maps is the primary renderer when the browser key loads cleanly.
// Without a usable Google map — missing key, blocked script, or auth failure —
// Leaflet draws OpenStreetMap tiles instead. Tiles only; markers always come
// from White Glove curated content. The map never queries a places provider
// for businesses or attractions.

export type { MapMarker } from "@/lib/map-markers";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function popupHtml(marker: MapMarker, centerName: string | null) {
  return [
    `<strong style="font-size:14px;color:#102F35">${escapeHtml(marker.name)}</strong>`,
    `<div style="color:${MAP_STYLE[marker.kind].color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(MAP_STYLE[marker.kind].label)}</div>`,
    marker.subtitle ? `<div style="color:#78716c;font-size:12px">${escapeHtml(marker.subtitle)}</div>` : "",
    marker.address ? `<div style="margin-top:4px;font-size:12px">${escapeHtml(marker.address)}</div>` : "",
    typeof marker.km === "number" && centerName
      ? `<div style="margin-top:4px;font-size:12px;color:#78716c">${marker.km.toFixed(1)} km from ${escapeHtml(centerName)}</div>`
      : "",
    `<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
       <a href="${escapeHtml(placeDirectionsUrl(marker.address, `${marker.lat}, ${marker.lng}`))}" target="_blank" rel="noreferrer" style="font-weight:700;color:#102F35">Navigate &rarr;</a>
       ${marker.href ? `<a href="${escapeHtml(marker.href)}" style="font-weight:700;color:#102F35">Open page &rarr;</a>` : ""}
       ${marker.phone ? `<a href="tel:${escapeHtml(marker.phone.replace(/[^\d+]/g, ""))}" style="font-weight:700;color:#102F35">${escapeHtml(marker.phone)}</a>` : ""}
     </div>`,
  ].filter(Boolean).join("");
}

/**
 * THE MAP ID IS WHAT MAKES AN ADVANCED MARKER POSSIBLE. Without one,
 * AdvancedMarkerElement renders nothing at all — not a smaller pin, none — so
 * the ID is passed to the map when it is configured, left off when it is not,
 * and the marker code reads the same constant. A build-time value, so it is
 * read once here rather than in each effect that needs the same answer.
 */
const MAP_ID = googleMapsMapId();

export default function AreaMap({
  center,
  centerName,
  markers,
  radiusKm = 25,
  loadKosher = true,
  height = 460,
}: {
  /** Null until somebody searches: the map then frames the curated collection. */
  center: { lat: number; lng: number } | null;
  centerName: string | null;
  markers: MapMarker[];
  radiusKm?: number;
  /** Include curated kosher listings in the map. */
  loadKosher?: boolean;
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.LayerGroup>>({});
  const gmapRef = useRef<GMap | null>(null);
  const gmarkersRef = useRef<GAnyMarker[]>([]);
  const ginfoRef = useRef<GInfoWindow | null>(null);
  const [engine, setEngine] = useState<"deciding" | "google" | "osm">("deciding");
  const [zoom, setZoom] = useState(11);
  const [shown, setShown] = useState<Record<MapKind, boolean>>({
    center: true, kever: true, attraction: true, stay: true, kosher: true, shul: true, airport: true,
  });

  const kosherMarkers = useMemo<MapMarker[]>(() => {
    if (!loadKosher) return [];
    const listings: readonly CuratedKosherPlaceNearby[] = center
      ? curatedKosherPlacesNear(center, radiusKm)
      : curatedKosherPlaces();
    return listings.flatMap((listing) => {
      if (listing.lat === undefined || listing.lng === undefined) return [];
      return [{
        id: `kosher-${listing.id}`,
        name: listing.name,
        subtitle: [listing.category, listing.diet].filter(Boolean).join(" · "),
        lat: listing.lat,
        lng: listing.lng,
        address: listing.address,
        phone: listing.phone,
        km: listing.km,
        kind: "kosher" as const,
      }];
    });
  }, [center, loadKosher, radiusKm]);

  const all = useMemo(() => [...markers, ...kosherMarkers], [markers, kosherMarkers]);
  const visible = useMemo(() => all.filter((marker) => shown[marker.kind]), [all, shown]);
  const frame = useMemo(() => boundsOf(visible.length ? visible : all), [visible, all]);

  // Google when available; OpenStreetMap tiles otherwise. Auth failures after
  // construct also fall through to OSM rather than leaving a blank box.
  useEffect(() => {
    let cancelled = false;
    let authOff: (() => void) | undefined;

    async function drawOsm() {
      if (cancelled || !boxRef.current || mapRef.current) return;
      for (const marker of gmarkersRef.current) detachMarker(marker);
      gmarkersRef.current = [];
      gmapRef.current = null;
      ginfoRef.current = null;
      boxRef.current.replaceChildren();

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
          ...(MAP_ID ? { mapId: MAP_ID } : {}),
          center: { lat: 48, lng: 14 },
          zoom: 4,
          gestureHandling: "cooperative",
          mapTypeControl: true,
          mapTypeControlOptions: { position: 1 },
          streetViewControl: false,
          fullscreenControl: true,
          fullscreenControlOptions: { position: 3 },
          zoomControl: true,
          zoomControlOptions: { position: 9 },
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

    void (async () => {
      authOff = onGoogleMapsAuthFailure(() => {
        if (!cancelled) void drawOsm();
      });

      const useGoogle = await loadGoogleMaps();
      if (cancelled || !boxRef.current) return;

      // Prefer Google whenever Map exists, even if load briefly reported false.
      if ((useGoogle || googleMaps()?.Map) && (await drawGoogle())) return;

      await drawOsm();
    })();

    return () => {
      cancelled = true;
      authOff?.();
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = {};
      for (const marker of gmarkersRef.current) detachMarker(marker);
      gmarkersRef.current = [];
      gmapRef.current = null;
      ginfoRef.current = null;
    };
  }, []);

  // A searched place stays at the centre. Otherwise frame curated markers.
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
      if (!maps) return;
      const bounds = new maps.LatLngBounds();
      bounds.extend({ lat: frame.north, lng: frame.east });
      bounds.extend({ lat: frame.south, lng: frame.west });
      gmapRef.current.fitBounds(bounds, 56);
      return;
    }
    mapRef.current?.fitBounds(
      [
        [frame.south, frame.west],
        [frame.north, frame.east],
      ],
      { padding: [56, 56] },
    );
  }, [center, frame, engine]);

  // Redraw White Glove markers on whichever engine is active.
  useEffect(() => {
    if (engine === "deciding") return;
    let cancelled = false;

    if (engine === "google") {
      const maps = googleMaps();
      const map = gmapRef.current;
      if (!maps || !map) return;
      for (const marker of gmarkersRef.current) detachMarker(marker);
      gmarkersRef.current = [];

      // One place the info window is opened from, so the two marker kinds
      // cannot drift apart in what a click does.
      const openFor = (item: MapMarker, marker: GAnyMarker) => {
        ginfoRef.current?.setContent(popupHtml(item, centerName));
        ginfoRef.current?.open({ map, anchor: marker });
      };

      void (async () => {
        // Google's icon is a URL, so the mark arrives already tinted — the same
        // MAP_STYLE colour the legend paints, drawn onto the same artwork. One
        // image per kind however many markers there are; the untinted mark is
        // the fallback if a browser will not give us a canvas, since gold line
        // art still beats a red Google balloon.
        const icons = {} as Record<MapKind, string>;
        await Promise.all(
          (Object.keys(MAP_STYLE) as MapKind[]).map(async (kind) => {
            icons[kind] = await tintedMarkUrl(MAP_STYLE[kind].color).catch(() => GLOVE_MARK_SRC);
          }),
        );
        if (cancelled || gmapRef.current !== map) return;

        /**
         * ADVANCED MARKERS WHEN BOTH HALVES ARE THERE, the old one when they
         * are not.
         *
         * google.maps.Marker is deprecated and warns in the console on every
         * page with a map on it. Its replacement needs two things this code
         * cannot assume: a Map ID on the map, and the marker library on the
         * bootstrap. If either is missing, AdvancedMarkerElement does not
         * degrade — it renders nothing, and the map loses every pin.
         *
         * A console warning is a cost worth paying to keep a map that has its
         * pins on it, so the deprecated class stays as the fallback, and the
         * condition is checked twice: once here for the two things that can be
         * read, and once below for the one that cannot.
         */
        const Advanced = MAP_ID ? maps.marker?.AdvancedMarkerElement : undefined;

        const drawAdvanced = (item: MapMarker) => {
          const pin = markPinFor(item.kind, zoom);
          // The new marker takes DOM rather than an icon URL, and anchors it
          // by its bottom centre — which is what the old anchorY of 97% was
          // approximating, so the geometry comes out the same.
          const img = document.createElement("img");
          img.src = icons[item.kind];
          img.width = pin.width;
          img.height = pin.height;
          img.alt = "";
          img.style.display = "block";
          const marker = new Advanced!({
            position: { lat: item.lat, lng: item.lng },
            map,
            title: item.name,
            content: img,
            // Without this the element is inert and the info window never
            // opens — the old marker was clickable by default.
            gmpClickable: true,
          });
          // "gmp-click" is the documented event; "click" still fires on
          // current builds. Both are listened for so neither a new nor an
          // older bootstrap leaves the pin dead.
          marker.addListener("gmp-click", () => openFor(item, marker));
          marker.addListener("click", () => openFor(item, marker));
          return marker;
        };

        const drawLegacy = (item: MapMarker) => {
          const pin = markPinFor(item.kind, zoom);
          const marker = new maps.Marker({
            position: { lat: item.lat, lng: item.lng },
            map,
            title: item.name,
            icon: {
              url: icons[item.kind],
              scaledSize: new maps.Size(pin.width, pin.height),
              anchor: new maps.Point(pin.anchorX, pin.anchorY),
            },
          });
          marker.addListener("click", () => openFor(item, marker));
          return marker;
        };

        for (const item of visible) gmarkersRef.current.push(Advanced ? drawAdvanced(item) : drawLegacy(item));

        /**
         * AND IF THE MAP ID ITSELF IS REFUSED, DRAW THEM AGAIN THE OLD WAY.
         *
         * The two checks above are answerable from this side: a variable is
         * set or it is not, a library loaded or it did not. Whether Google
         * accepts the ID is not — it can be deleted, renamed, restricted to
         * another referrer, or simply be having a bad afternoon, and the
         * answer arrives asynchronously as a console error rather than as
         * anything this code is handed. What that failure looks like on the
         * page is a map with no pins on it, which is the one outcome worth
         * writing code to avoid.
         *
         * So the pins are looked for after a frame. Every advanced marker
         * renders a <gmp-advanced-marker> inside the map; if not one of them
         * is there, the ID did not work, and the whole set is drawn again with
         * the deprecated marker — which needs no Map ID and has never needed
         * one. The console keeps its deprecation warning that day, and the map
         * keeps its markers.
         */
        if (Advanced && visible.length > 0) {
          await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
          if (cancelled || gmapRef.current !== map) return;
          if (!boxRef.current?.querySelector("gmp-advanced-marker")) {
            for (const marker of gmarkersRef.current) detachMarker(marker);
            gmarkersRef.current = visible.map(drawLegacy);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const map = mapRef.current;
    if (!map) return;
    void (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      for (const group of Object.values(layersRef.current)) group.clearLayers();

      for (const item of visible) {
        // A div icon, not an image: Leaflet cannot tint an <img>, and the mark
        // is coloured by masking the line art the legend chips use. Leaflet
        // still puts the title, tabindex and role=button on whatever element
        // the icon returns, so the pins stay reachable by keyboard.
        const pin = markPinFor(item.kind, zoom);
        const icon = leaflet.divIcon({
          className: "wg-map-pin",
          html: `<span class="wg-glove-mark" style="display:block;width:100%;height:100%;background-color:${pin.color}"></span>`,
          iconSize: [pin.width, pin.height],
          iconAnchor: [pin.anchorX, pin.anchorY],
          popupAnchor: [0, -pin.anchorY],
        });
        const dot = leaflet.marker([item.lat, item.lng], { icon, title: item.name });
        dot.bindPopup(popupHtml(item, centerName));
        dot.addTo(layersRef.current[item.kind]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [centerName, engine, visible, zoom]);

  const where = centerName ? `within ${radiusKm} km of ${centerName}` : "on the map";

  return (
    <div>
      <p className="text-sm leading-6 text-[var(--navy)]">
        Places {where}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {TOGGLEABLE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setShown((current) => ({ ...current, [kind]: !current[kind] }))}
            aria-pressed={shown[kind]}
            className={`inline-flex min-h-11 items-center gap-2 border px-3 text-[11px] font-bold uppercase tracking-[0.1em] transition ${
              shown[kind] ? "border-[var(--navy)] text-[var(--navy)]" : "border-[var(--gold-light)] text-stone-400 line-through decoration-1"
            }`}
          >
            <span aria-hidden="true" className="w-2.5 text-center">{shown[kind] ? "✓" : "×"}</span>
            <CompassMark kind={kind} muted={!shown[kind]} />
            {MAP_STYLE[kind].label}
          </button>
        ))}
      </div>

      <div
        ref={boxRef}
        style={{ height }}
        className="wg-map-box mt-3 w-full border border-[var(--gold-light)] bg-[#FAF8F3]"
        role="application"
        aria-label={centerName ? `Map of what is around ${centerName}` : "Map of curated White Glove listings"}
      />

      <p className="mt-2 text-xs leading-5 text-stone-500">
        {engine === "deciding"
          ? "Loading the map…"
          : engine === "google"
            ? "Hold ctrl (or use two fingers) to zoom, so the page still scrolls past the map on a phone."
            : "Scroll-zoom turns on once you click the map, so the page still scrolls past it on a phone. Map tiles from OpenStreetMap; listings are White Glove curated content."}
      </p>
    </div>
  );
}
