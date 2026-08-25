"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * "I am staying here — what is near me?"
 *
 * TWO CALLS, AND ONLY ONE OF THEM COSTS ANYTHING. Finding the hotel goes
 * through /api/lodging/places-search, which is Google's Places API on a
 * metered key — so it is debounced and only asked once somebody has typed
 * enough to mean something. Measuring what is near it goes to /api/near,
 * which reads files already in the bundle and costs nothing but a little CPU.
 *
 * WHY IT ASKS FOR A HOTEL BY NAME rather than reading the browser's location:
 * somebody plans this from home, days before they travel. A "share your
 * location" prompt would answer the wrong question and ask for a permission
 * the page has no business having.
 */

type Nearby = {
  name: string;
  distance: string;
  walk: string | null;
  walkNote: string | null;
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

type Hotel = { name: string; address?: string; coordinates?: string };

function Row({ item }: { item: Nearby }) {
  const body = (
    <>
      <span className="font-semibold text-[var(--navy)]">{item.name}</span>
      {item.kind && <span className="ml-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{item.kind}</span>}
    </>
  );
  return (
    <li className="border-l-2 border-[var(--gold-light)] py-1 pl-4">
      {item.href ? (
        <Link href={item.href} className="underline decoration-[var(--gold-light)] underline-offset-4">
          {body}
        </Link>
      ) : (
        body
      )}
      <p className="mt-0.5 text-sm text-stone-600">
        {item.distance}
        {item.walk ? ` · ${item.walk}` : ""}
      </p>
      {item.note && <p className="mt-0.5 text-sm leading-6 text-stone-600">{item.note}</p>}
      {item.address && <p className="mt-0.5 text-sm leading-6 text-stone-600">{item.address}</p>}
      {item.walkNote && <p className="mt-0.5 text-xs leading-5 text-stone-500">{item.walkNote}</p>}
    </li>
  );
}

function Section({ title, items, blurb }: { title: string; items: Nearby[]; blurb?: string }) {
  // Nothing near enough is not a section. AGENTS.md: an empty public section
  // is hidden, not shown empty.
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-lg font-bold text-[var(--navy)]">{title}</h3>
      {blurb && <p className="mt-1 text-sm leading-6 text-stone-600">{blurb}</p>}
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <Row key={`${title}-${item.name}-${item.distance}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

export default function NearMyHotel() {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Hotel[]>([]);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<Hotel | null>(null);
  const [result, setResult] = useState<NearResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const picked = useRef(false);

  // Everything that sets state happens inside the timer, never in the effect
  // body: a synchronous setState during an effect is an extra render pass on
  // every keystroke, and the lint rule that forbids it is right.
  useEffect(() => {
    const q = query.trim();
    if (picked.current) {
      picked.current = false;
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      if (q.length < 3) {
        setOptions([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/lodging/places-search?q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => null);
        // Only a result with a position can be measured from.
        if (active) setOptions((data?.results ?? []).filter((r: Hotel) => r.coordinates));
      } catch {
        if (active) setOptions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  async function choose(hotel: Hotel) {
    picked.current = true;
    setQuery(hotel.name);
    setOptions([]);
    setChosen(hotel);
    setResult(null);
    setError("");
    if (!hotel.coordinates) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/near?at=${encodeURIComponent(hotel.coordinates)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data) setResult(data as NearResult);
      else setError(data?.error || "Could not work that out just now.");
    } catch {
      setError("Could not reach the site just now.");
    } finally {
      setLoading(false);
    }
  }

  const nothing =
    result && result.quarters.length === 0 && result.shuls.length === 0 && result.thingsToDo.length === 0 && result.food.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="near-hotel" className="text-sm font-semibold text-[var(--navy)]">
          Where are you staying?
        </label>
        <input
          id="near-hotel"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hotel name, or an address"
          autoComplete="off"
          className="mt-2 min-h-11 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 text-[var(--navy)]"
        />
        {searching && <p className="mt-2 text-sm text-stone-500">Looking…</p>}
        {options.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 border border-[var(--gold-light)] bg-white p-2">
            {options.map((hotel) => (
              <li key={`${hotel.name}-${hotel.coordinates}`}>
                <button
                  type="button"
                  onClick={() => void choose(hotel)}
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

      {chosen && result && (
        <div className="flex flex-col gap-8">
          <p className="text-sm leading-6 text-stone-600">
            From <span className="font-semibold text-[var(--navy)]">{chosen.name}</span>
            {chosen.address ? `, ${chosen.address}` : ""}.
          </p>

          {nothing ? (
            <p className="leading-7 text-stone-600">
              Nothing on this site is close enough to that address to measure. The{" "}
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

      {chosen && !result && !loading && !error && (
        <Button type="button" variant="secondary" onClick={() => void choose(chosen)}>
          Try again
        </Button>
      )}
    </div>
  );
}
