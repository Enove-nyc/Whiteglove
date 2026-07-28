"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as L from "leaflet";
import { fetchKosherPlaces, type KosherPlace } from "@/lib/kosher-osm";
import { placeDirectionsUrl } from "@/data/route-utils";

// What is around a place, on a map.
//
// Tiles are OpenStreetMap, which needs no key and no billing — the Google key
// this site holds is restricted to the Routes API and deliberately never
// reaches the browser. Kevarim come from our own database; kosher places come
// live from OSM through Overpass, the same source the kosher finder uses. We
// plot what those sources actually contain and nothing else.

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

  // Leaflet touches window on import, so it can only be loaded in the browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      setKosherState((s) => (s === "idle" ? "idle" : s));
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-centre when the searched place changes.
  useEffect(() => {
    mapRef.current?.setView([center.lat, center.lng], 11);
  }, [center.lat, center.lng]);

  // Draw the markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
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
        const lines = [
          `<strong style="font-size:14px;color:#172d52">${escapeHtml(m.name)}</strong>`,
          m.subtitle ? `<div style="color:#78716c;font-size:12px">${escapeHtml(m.subtitle)}</div>` : "",
          m.address ? `<div style="margin-top:4px;font-size:12px">${escapeHtml(m.address)}</div>` : "",
          typeof m.km === "number" ? `<div style="margin-top:4px;font-size:12px;color:#78716c">${m.km.toFixed(1)} km from ${escapeHtml(centerName)}</div>` : "",
          `<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
             <a href="${escapeHtml(placeDirectionsUrl(m.address, `${m.lat}, ${m.lng}`))}" target="_blank" rel="noreferrer" style="font-weight:700;color:#172d52">Navigate →</a>
             ${m.href ? `<a href="${escapeHtml(m.href)}" style="font-weight:700;color:#172d52">Open page →</a>` : ""}
             ${m.phone ? `<a href="tel:${escapeHtml(m.phone.replace(/[^\d+]/g, ""))}" style="font-weight:700;color:#172d52">${escapeHtml(m.phone)}</a>` : ""}
           </div>`,
        ];
        dot.bindPopup(lines.filter(Boolean).join(""));
        dot.addTo(layersRef.current[m.kind]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [all, shown, centerName]);

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
              className={`inline-flex min-h-[36px] items-center gap-2 border px-3 text-[11px] font-bold uppercase tracking-[0.1em] transition ${
                shown[kind] ? "border-[var(--navy)] text-[var(--navy)]" : "border-[var(--gold-light)] text-stone-400"
              }`}
            >
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
        Scroll-zoom turns on once you click the map, so the page still scrolls past it on a phone. Kevarim are ours;
        kosher places come live from OpenStreetMap and its coverage varies by region — an empty map means OSM has
        nothing listed there, not that there is nothing there.
      </p>
    </div>
  );
}
