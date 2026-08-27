"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import AddToItineraryButton from "@/components/AddToItineraryButton";
import { Button } from "@/components/ui/Button";
import { useDebouncedSearch } from "@/components/useDebouncedSearch";
import { placeDirectionsUrl } from "@/data/route-utils";
import { mapHref } from "@/lib/map-links";
import type { NearAnchor } from "@/lib/near-anchors";

/**
 * "What is near HERE" — where HERE is anything a traveler can name.
 *
 * WHAT THIS REPLACED. The page took one kind of answer: the name of a hotel,
 * looked up on Google's metered key. That is the question somebody asks the
 * week they travel. It is not the question they ask while choosing between two
 * areas, or the morning they land at an airport, or standing at a landmark
 * wondering where to eat — and for all three the site already knew the
 * coordinates and could not be asked.
 *
 * THE FREE ANSWER FIRST. Typing searches the site's own anchors — airports,
 * Jewish quarters, the things to do — and OpenStreetMap for anything else, a
 * city, a street, a postcode. Neither costs a key, which is why they may run
 * while somebody types. The hotel lookup is metered, so it is a button rather
 * than a keystroke: it sits under the free results and is asked only when
 * somebody presses it.
 *
 * LOCATION IS OFFERED, NEVER REQUIRED, AND NEVER ASKED FOR ON ITS OWN. The
 * page loads, works and answers with the permission refused or never granted:
 * the browser is only asked after somebody presses the button that says it
 * will be. Somebody planning from home three weeks out is the ordinary case,
 * and their current position is the answer to a different question — which is
 * why this is one door of three rather than the front door.
 *
 * TWO ACTIONS ON A CARD, NOT FIVE. Navigate, and put it on the trip. A row
 * that offers to do six things is a menu to read rather than an answer.
 */

type Nearby = {
  name: string;
  distance: string;
  walk: string | null;
  walkNote: string | null;
  coordinates?: string | null;
  address?: string | null;
  city?: string;
  kind?: string;
  note?: string;
  href?: string;
};

type NearResult = {
  quarters: Nearby[];
  shuls: Nearby[];
  thingsToDo: Nearby[];
  food: Nearby[];
};

/**
 * Where the measuring is done from, however the visitor got there.
 *
 * `kind` decides the ruler, not the wording: from an airport nobody walks
 * anywhere, so the ranges widen. See DRIVING_RANGES in data/near-me.ts.
 */
type Anchor = { label: string; hint?: string; at: string; kind?: string };

type Hotel = { name: string; address?: string; coordinates?: string };

const ANCHOR_KIND_LABEL: Record<string, string> = {
  airport: "Airport",
  quarter: "Jewish quarter",
  landmark: "Place to see",
  place: "On the map",
};

/** Module scope, so the debounce is not restarted on every render. */
async function searchAnchors(query: string): Promise<NearAnchor[]> {
  const res = await fetch(`/api/near/where?q=${encodeURIComponent(query)}`);
  const data = (await res.json().catch(() => null)) as { results?: NearAnchor[] } | null;
  return data?.results ?? [];
}

function Card({ item, saveable }: { item: Nearby; saveable: boolean }) {
  const detail = item.note || item.address || item.city || null;
  return (
    <li className="border-l-2 border-[var(--gold-light)] py-1 pl-4">
      <p>
        {item.href ? (
          <Link href={item.href} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold-light)] underline-offset-4">
            {item.name}
          </Link>
        ) : (
          <span className="font-semibold text-[var(--navy)]">{item.name}</span>
        )}
        {item.kind && <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{item.kind}</span>}
      </p>
      <p className="mt-0.5 text-sm text-stone-600">
        {item.distance}
        {item.walk ? ` · ${item.walk}` : ""}
      </p>
      {/* One detail, the most useful one there is — not all three. */}
      {detail && <p className="mt-0.5 text-sm leading-6 text-stone-600">{detail}</p>}
      {item.walkNote && <p className="mt-0.5 text-xs leading-5 text-stone-500">{item.walkNote}</p>}
      {item.coordinates && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <a
            href={placeDirectionsUrl(item.address, item.coordinates)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 sm:min-h-0"
          >
            Navigate
          </a>
          {saveable && (
            <AddToItineraryButton
              place={{ id: `near-${item.name}`, name: item.name, address: item.address ?? undefined, coordinates: item.coordinates }}
              className="sm:min-h-0"
            />
          )}
        </p>
      )}
    </li>
  );
}

function Section({
  title,
  items,
  blurb,
  saveable = true,
}: {
  title: string;
  items: Nearby[];
  blurb?: string;
  saveable?: boolean;
}) {
  // Nothing near enough is not a section. AGENTS.md: an empty public section
  // is hidden, not shown empty.
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-lg font-bold text-[var(--navy)]">{title}</h3>
      {blurb && <p className="mt-1 text-sm leading-6 text-stone-600">{blurb}</p>}
      <ul className="mt-3 flex flex-col gap-4">
        {items.map((item) => (
          <Card key={`${title}-${item.name}-${item.distance}`} item={item} saveable={saveable} />
        ))}
      </ul>
    </section>
  );
}

export default function NearbyExplorer() {
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [result, setResult] = useState<NearResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [hotelSearching, setHotelSearching] = useState(false);

  const { results: found, searching } = useDebouncedSearch<NearAnchor>(query, {
    minLength: 2,
    delayMs: 300,
    search: searchAnchors,
  });

  const measure = useCallback(async (from: Anchor) => {
    setAnchor(from);
    setQuery("");
    setHotels(null);
    setResult(null);
    setError("");
    setLoading(true);
    try {
      const mode = from.kind === "airport" ? "drive" : "walk";
      const res = await fetch(`/api/near?at=${encodeURIComponent(from.at)}&mode=${mode}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data) setResult(data as NearResult);
      else setError(data?.error || "Could not work that out just now.");
    } catch {
      setError("Could not reach the site just now.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * The browser is asked here and nowhere else — inside the handler for the
   * button that says it will be asked.
   */
  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser cannot share a location. Type where you are instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void measure({
          label: "Where you are now",
          at: `${position.coords.latitude}, ${position.coords.longitude}`,
        });
      },
      () => {
        setLocating(false);
        // A refusal is not a failure. The typing route answers the same
        // question, so say that rather than asking again.
        setError("No location this time — type a city, an airport or a landmark instead.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function findHotel(name: string) {
    setHotelSearching(true);
    setError("");
    try {
      const res = await fetch(`/api/lodging/places-search?q=${encodeURIComponent(name)}`);
      const data = await res.json().catch(() => null);
      // Only a hotel with a position can be measured from.
      const rows = ((data?.results ?? []) as Hotel[]).filter((r) => r.coordinates);
      setHotels(rows);
      if (rows.length === 0) setError(data?.reason || "No hotel by that name came back.");
    } catch {
      setHotels([]);
      setError("Could not reach the hotel lookup just now.");
    } finally {
      setHotelSearching(false);
    }
  }

  const typed = query.trim();
  const nothing =
    result && result.quarters.length === 0 && result.shuls.length === 0 && result.thingsToDo.length === 0 && result.food.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="near-where" className="text-sm font-semibold text-[var(--navy)]">
          Where do you want to look around?
        </label>
        <input
          id="near-where"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A city, an airport, a landmark, a postcode"
          autoComplete="off"
          className="mt-2 min-h-11 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 text-[var(--navy)]"
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 disabled:opacity-60"
          >
            {locating ? "Asking your browser…" : "Or use my location"}
          </button>
          {searching && <span className="text-sm text-stone-500">Looking…</span>}
        </div>

        {found.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 border border-[var(--gold-light)] bg-white p-2">
            {found.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => void measure({ label: option.label, hint: option.hint, at: option.at, kind: option.kind })}
                  className="w-full px-2 py-2 text-left text-sm hover:bg-[var(--cream)]"
                >
                  <span className="font-semibold text-[var(--navy)]">{option.label}</span>
                  <span className="block text-stone-600">
                    {option.hint}
                    {ANCHOR_KIND_LABEL[option.kind] ? ` · ${ANCHOR_KIND_LABEL[option.kind]}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* The metered lookup. Offered whenever something has been typed —
            "Hilton Garden Inn Vienna" matches Vienna in the free list, so
            hiding this until the free search came back empty would have hidden
            it from nearly every hotel name — and fired only by a press, which
            is what keeps the Google key out of the typing. */}
        {typed.length >= 3 && (
          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={() => void findHotel(typed)} disabled={hotelSearching}>
              {hotelSearching ? "Looking for the hotel…" : `Staying there? Look for a hotel called “${typed}”`}
            </Button>
          </div>
        )}

        {hotels && hotels.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 border border-[var(--gold-light)] bg-white p-2">
            {hotels.map((hotel) => (
              <li key={`${hotel.name}-${hotel.coordinates}`}>
                <button
                  type="button"
                  onClick={() => void measure({ label: hotel.name, hint: hotel.address, at: hotel.coordinates ?? "" })}
                  className="w-full px-2 py-2 text-left text-sm hover:bg-[var(--cream)]"
                >
                  <span className="font-semibold text-[var(--navy)]">{hotel.name}</span>
                  {hotel.address && <span className="block text-stone-600">{hotel.address}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      {loading && <p className="text-sm text-stone-500">Measuring…</p>}

      {anchor && result && (
        <div className="flex flex-col gap-8">
          <p className="text-sm leading-6 text-stone-600">
            From <span className="font-semibold text-[var(--navy)]">{anchor.label}</span>
            {anchor.hint ? `, ${anchor.hint}` : ""}.{" "}
            {/* The same answer, drawn rather than listed. The map opens on this
                point rather than on the whole world, which is what the link
                exists for. */}
            <Link
              href={mapHref({ at: anchor.at, name: anchor.label, radius: 25 })}
              className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              See this on the map
            </Link>
          </p>

          {nothing ? (
            <p className="leading-7 text-stone-600">
              Nothing on this site is close enough to that spot to measure. The{" "}
              <Link href="/kosher" className="font-semibold text-[var(--gold-ink)] underline">
                kosher food finder
              </Link>{" "}
              and the{" "}
              <Link href="/map" className="font-semibold text-[var(--gold-ink)] underline">
                map
              </Link>{" "}
              cover the whole site.
            </p>
          ) : (
            <>
              <Section
                title="The Jewish quarter"
                items={result.quarters}
                blurb="Where the kosher food, the shuls and the rest of it are — the walk that matters most on Shabbos."
                // A quarter is an area, not a stop on a day.
                saveable={false}
              />
              <Section title="Shuls" items={result.shuls} />
              <Section title="Kosher food" items={result.food} />
              <Section title="Things to do" items={result.thingsToDo} />

              {/* Said once, plainly, rather than repeated under every distance. */}
              <p className="text-xs leading-5 text-stone-500">
                Distances are measured in a straight line and allow for streets being longer. Treat them as a guide, not
                as a route — and give yourself more time than this before Shabbos.
              </p>
            </>
          )}
        </div>
      )}

      {anchor && !result && !loading && !error && (
        <Button type="button" variant="secondary" onClick={() => void measure(anchor)}>
          Try again
        </Button>
      )}
    </div>
  );
}
