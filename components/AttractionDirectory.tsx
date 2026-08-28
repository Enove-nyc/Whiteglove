"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import KosherNearby from "@/components/KosherNearby";
import MoreActions from "@/components/MoreActions";
import RateExperienceLink from "@/components/RateExperienceLink";
import SuggestEditPanel from "@/components/SuggestEditPanel";
import SaveTripItemButton from "@/components/SaveTripItemButton";
import AddToItineraryButton from "@/components/AddToItineraryButton";
import { ACTION_BUTTON_CLASS } from "@/lib/action-button";
import { staySearchHref } from "@/lib/stay-search";
import ListToolbar from "@/components/ListToolbar";
import { useListUrl } from "@/components/useListUrl";
import { placeDirectionsUrl } from "@/data/route-utils";
import type { AttractionCard, AttractionFacets } from "@/data/attraction-list";

// What to do on the days that are not kevarim.
//
// Every attraction with coordinates can show White Glove's curated kosher
// listings nearby. Nothing is inferred from a map-provider business index.

/** How many cards before the page stops and asks. */
const PAGE = 24;
/** Long enough that a typed city name is one request, short enough to feel live. */
const SETTLE_MS = 250;

const DEFAULTS = { q: "", country: "", kind: "", city: "" };

/**
 * WHERE THE SEARCH HAPPENS: on the server, see data/attraction-list.ts. This
 * page used to hold all 781 attractions to filter them in the browser while
 * drawing 24, which made it the heaviest page on the site for three per cent
 * of what it carried. The first page is rendered by the server; every later
 * search asks /api/things-to-do/list for exactly what it will draw.
 *
 * AND THE ANCHOR IS FIXED HERE. /stops and the planner link to
 * /things-to-do#slug, and that anchor only existed if the entry happened to
 * be among the drawn 24 — a link to any of the other 757 landed on the top of
 * a page that did not contain it. A fragment never reaches the server, so the
 * page asks for that one entry once it is running and shows it first.
 */
export default function AttractionDirectory({
  initial,
  initialMore,
  facets,
}: {
  initial: AttractionCard[];
  initialMore: boolean;
  facets: AttractionFacets;
}) {
  // In the address bar, so a filtered list is a link somebody can send and
  // survives a press of the back button from an entry. components/useListUrl.ts.
  const [filters, setFilters, reset] = useListUrl(DEFAULTS);
  const { q: query, country, kind, city } = filters;
  const [openNearby, setOpenNearby] = useState<string | null>(null);

  const [rows, setRows] = useState<AttractionCard[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The entry an anchor asked for, when it was not on the page already. */
  const [anchored, setAnchored] = useState<AttractionCard | null>(null);

  // Which request the answer on screen belongs to: a slow early request must
  // not overwrite a later, faster one.
  const asked = useRef(0);
  // The server already rendered the first page; asking for it again on mount
  // would be a wasted round trip on every visit.
  const mounted = useRef(false);

  const countries = useMemo(() => facets.countries.map((value) => ({ value, label: value })), [facets]);
  const kinds = useMemo(() => facets.kinds.map((value) => ({ value, label: value })), [facets]);
  /**
   * The cities of whichever country is chosen, rather than all of them.
   *
   * This page runs to several hundred entries across a dozen countries, and a
   * flat list of every city in a select is not a filter anybody uses. Narrowed
   * by the country above it, it becomes the control somebody actually wants:
   * "the ones in Rome".
   */
  const cities = useMemo(
    () => (country ? facets.citiesByCountry[country] ?? [] : facets.cities).map((value) => ({ value, label: value })),
    [facets, country],
  );

  async function load(next: { q: string; country: string; kind: string; city: string; offset: number }) {
    const mine = ++asked.current;
    setBusy(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(next.offset) });
      if (next.q) params.set("q", next.q);
      if (next.country) params.set("country", next.country);
      if (next.kind) params.set("kind", next.kind);
      if (next.city) params.set("city", next.city);
      const res = await fetch(`/api/things-to-do/list?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { rows?: AttractionCard[]; more?: boolean };
      if (mine !== asked.current) return;
      if (!res.ok || !data.rows) {
        setFailed(true);
        return;
      }
      setRows((prev) => (next.offset ? [...prev, ...data.rows!] : data.rows!));
      setMore(Boolean(data.more));
    } catch {
      if (mine === asked.current) setFailed(true);
    } finally {
      if (mine === asked.current) setBusy(false);
    }
  }

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(() => void load({ q: query, country, kind, city, offset: 0 }), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, country, kind, city]);

  /**
   * The anchor a link arrived with — /things-to-do#polin-museum.
   *
   * Runs once, on arrival. If the entry is already on the page the browser
   * scrolls to it by itself and there is nothing to do; otherwise it is
   * fetched and shown first, and then scrolled to.
   */
  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!slug || initial.some((a) => a.slug === slug)) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/things-to-do/list?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const data = (await res.json()) as { rows?: AttractionCard[] };
        const found = data.rows?.[0];
        if (!live || !found) return;
        setAnchored(found);
        // After paint, so the element exists to scroll to.
        requestAnimationFrame(() => document.getElementById(found.slug)?.scrollIntoView({ block: "start" }));
      } catch {
        // A link that cannot be resolved leaves the directory as it is, which
        // is what happened before this existed.
      }
    })();
    return () => {
      live = false;
    };
  }, [initial]);

  // The anchored entry first, and never twice.
  const visible = anchored ? [anchored, ...rows.filter((a) => a.slug !== anchored.slug)] : rows;

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={(q) => setFilters({ q })}
        placeholder="Rome, waterfall, ghetto, something for the children…"
        searchLabel="Search things to do"
        empty={visible.length === 0 && !busy && !failed}
        mapHref="/map"
        onReset={() => reset()}
        filters={[
          {
            label: "Country",
            value: country,
            // Changing the country empties the city, because the city that was
            // chosen is not in the new one.
            onChange: (value: string) => setFilters({ country: value, city: "" }),
            options: countries,
            allLabel: "Everywhere",
          },
          { label: "City", value: city, onChange: (value: string) => setFilters({ city: value }), options: cities, allLabel: "Any city" },
          { label: "Category", value: kind, onChange: (value: string) => setFilters({ kind: value }), options: kinds, allLabel: "Anything" },
        ]}
      />

      {failed && (
        <p role="status" className="mt-5 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The search could not be reached just now. Try again in a moment.
        </p>
      )}

      <div className={`mt-8 grid gap-5 md:grid-cols-2 ${busy ? "opacity-60" : ""}`}>
        {visible.map((a) => (
          // The id is what /stops and the planner link to — this page is one
          // page with an anchor per entry, not a page each.
          <article key={a.slug} id={a.slug} className="min-w-0 scroll-mt-24 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">
              {a.city} · {a.country} · {a.kind}
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{a.name}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{a.summary}</p>

            {a.notes && a.notes.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">
                {a.notes.map((note, i) => (
                  <li key={i} className="border-l-2 border-[var(--gold-light)] pl-3">{note}</li>
                ))}
              </ul>
            )}

            {/* WHAT TO DO WITH IT, on the card that made you want to.
                Somebody who has just read that the Colosseum is twenty minutes
                from the Ghetto has one of two next thoughts — where would we
                sleep, and can I keep this — and until now the answer to both
                was to go back to the navigation and start again.

                THREE CONTROLS, NOT NINE. This row carried Navigate, Website,
                Full guide, Kosher food near here, Add to Route, Add to
                Itinerary, Where to stay, Plan a trip here, Rate and Suggest
                edit, all at once, on every one of several hundred cards. Nine
                is not a choice, it is a wall — and a screen reader reading the
                page's links got the same nine names over and over with the
                place's name nowhere near them. The guide (where there is one)
                and the two that put the place into a trip stay out here,
                because those are why somebody is reading a directory rather
                than a guide. The rest is a second thought and is one press
                away. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--gold-light)] pt-4 text-sm">
              {a.internalHref && (
                <Link
                  href={a.internalHref}
                  className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] px-3 font-semibold text-[var(--navy)]"
                >
                  Full guide
                </Link>
              )}
              <SaveTripItemButton
                // A saved place needs an address to navigate to. Not every
                // attraction record carries one — a valley or a lake shore is
                // a coordinate and nothing else — so the town is the fallback
                // rather than an empty string that would print as a blank line
                // in the route.
                item={{
                  id: `attraction-${a.slug}`,
                  name: a.name,
                  address: a.address || `${a.city}, ${a.country}`,
                  coordinates: a.coordinates,
                  href: `/things-to-do#${a.slug}`,
                }}
                label="Add to Route"
              />
              {/* The route is the driving order; the itinerary is the trip.
                  The card offered only the first, so a place you wanted on
                  the trip could be saved as a stop and nothing more. */}
              <AddToItineraryButton
                place={{
                  id: `attraction-${a.slug}`,
                  name: a.name,
                  address: a.address || `${a.city}, ${a.country}`,
                  coordinates: a.coordinates,
                }}
              />
              <MoreActions label={a.name}>
                {a.coordinates && (
                  <a
                    href={placeDirectionsUrl(a.address, a.coordinates)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                  >
                    Navigate →
                  </a>
                )}
                {a.website && (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                  >
                    Website ↗
                  </a>
                )}
                {a.coordinates && (
                  <button
                    type="button"
                    onClick={() => setOpenNearby(openNearby === a.slug ? null : a.slug)}
                    className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                  >
                    {openNearby === a.slug ? "Hide what's nearby" : "Kosher food near here"}
                  </button>
                )}
                <Link
                  href={staySearchHref({ destination: a.city })}
                  className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                >
                  Where to stay in {a.city} →
                </Link>
                <Link
                  href={`/plan?destination=${encodeURIComponent(a.city)}`}
                  className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                >
                  Plan a trip here →
                </Link>
                <RateExperienceLink kind="listing" refId={a.slug} label={a.name} />
                <SuggestEditPanel targetType="site" targetId={a.slug} title={a.name} compact />
              </MoreActions>
            </div>

            {openNearby === a.slug && a.coordinates && (
              <div className="mt-4">
                <KosherNearby coordinates={a.coordinates} radiusKm={6} autoLoad showAddToTrip heading={`Kosher near ${a.name}`} />
              </div>
            )}

            {a.address && <p className="mt-4 break-words text-xs leading-5 text-stone-500">{a.address}</p>}
          </article>
        ))}
      </div>

      {/* PROGRESSIVE, NOT PAGINATED. Nearby curated listings are shown only
          when a traveler opens a card, so the directory stays quick to scan.
          Numbered
          pages would break the anchor links: /stops and the planner link
          straight to #slug on this page, and an entry on page four of a
          paginated list is a link that lands nowhere. That was true and those
          links WERE landing nowhere — an entry outside the drawn 24 was not on
          the page at all. The anchor is fetched and shown first now; see the
          effect above. */}
      {more && (
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load({ q: query, country, kind, city, offset: rows.length })}
            className={`inline-flex min-h-11 items-center ${ACTION_BUTTON_CLASS.primary}`}
          >
            Show more
          </button>
        </div>
      )}
    </>
  );
}
