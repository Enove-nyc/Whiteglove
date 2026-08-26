"use client";

import { useEffect, useRef, useState } from "react";
import AddToItineraryButton from "@/components/AddToItineraryButton";
import SuggestEditPanel from "@/components/SuggestEditPanel";
import ListToolbar from "@/components/ListToolbar";
import { IconLink } from "@/components/icons/IconAction";
import { placeDirectionsUrl } from "@/data/route-utils";
import { hechsherLabel } from "@/data/hechsherim";
import type { EateryCard } from "@/data/eatery-search";

/**
 * The curated kosher listings. The food finder filters this same White Glove
 * collection, so every public card has the same editorial boundary.
 *
 * WHERE THE SEARCH HAPPENS. On the server — see data/eatery-search.ts. This
 * page used to hold all 1,466 listings in the browser and filter them there,
 * which meant a megabyte of records, notes and summaries downloaded to draw
 * sixty cards, by somebody on hotel wifi looking for one restaurant. Now the
 * first page is rendered by the server and every later search asks
 * /api/kosher/search for exactly what it will draw.
 *
 * The matcher is unchanged (lib/list-search.ts, shared with every other list
 * here), so a query finds what it always found.
 *
 * WHAT THIS COSTS, HONESTLY: typing now waits on a round trip where it used to
 * be instant. That is why the box is debounced rather than fired per keystroke,
 * why the previous results stay on screen while the next ones come, and why
 * the first sixty arrive with the page already drawn — the common case, a
 * visitor who reads what is in front of them, touches the network not at all.
 */

const PAGE = 60;
/** Long enough that a typed city name is one request, short enough to feel live. */
const SETTLE_MS = 250;

function toneFor(state: string) {
  if (state === "certified") return "border-emerald-500 bg-emerald-50 text-emerald-900";
  if (state === "none") return "border-stone-300 bg-stone-50 text-stone-600";
  return "border-amber-400 bg-amber-50 text-amber-900";
}

export default function EateryDirectory({
  initial,
  initialMore,
  countries,
  kinds,
}: {
  initial: EateryCard[];
  initialMore: boolean;
  countries: string[];
  kinds: string[];
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [kind, setKind] = useState("");
  const [rows, setRows] = useState<EateryCard[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Which request the answer on screen belongs to. A slow first request must
  // not overwrite the results of a later, faster one — the classic way a
  // search box ends up showing the answer to a question nobody asked last.
  const asked = useRef(0);
  // The first render already has the server's answer for the empty search;
  // fetching it again on mount would be a wasted round trip on every visit.
  const mounted = useRef(false);

  async function load(next: { query: string; country: string; kind: string; offset: number }) {
    const mine = ++asked.current;
    setBusy(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(next.offset) });
      if (next.query) params.set("q", next.query);
      if (next.country) params.set("country", next.country);
      if (next.kind) params.set("kind", next.kind);
      const res = await fetch(`/api/kosher/search?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { rows?: EateryCard[]; more?: boolean };
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
    const timer = setTimeout(() => void load({ query, country, kind, offset: 0 }), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, country, kind]);

  return (
    <>
      {/* Said once, above the one search. It used to sit above a second search
          box further down the page that looked through the same listings. */}
      <p className="mb-5 border-l-4 border-[var(--gold)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-stone-600">
        White Glove&apos;s curated kosher restaurants, bakeries and groceries — search by city, country, kind or name.
        Confirm current supervision directly before you go.
      </p>

      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Rome, bakery, meat, Antwerp…"
        searchLabel="Search kosher listings"
        empty={rows.length === 0 && !busy && !failed}
        filters={[
          { label: "Country", value: country, onChange: setCountry, options: countries.map((value) => ({ value, label: value })), allLabel: "Everywhere" },
          { label: "Kind", value: kind, onChange: setKind, options: kinds.map((value) => ({ value, label: value })), allLabel: "Anything" },
        ]}
      />

      {failed && (
        <p role="status" className="mt-5 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The search could not be reached just now. Try again in a moment.
        </p>
      )}

      <div className={`mt-8 grid gap-5 md:grid-cols-2 ${busy ? "opacity-60" : ""}`}>
        {rows.map((e) => (
          <article key={e.slug} id={e.slug} className="min-w-0 scroll-mt-24 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">
              {[e.city, e.country, e.kind, e.diet].filter(Boolean).join(" · ")}
            </p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">{e.name}</h3>

            {/* The kashrus line comes before anything practical because it is
                the thing that decides whether the rest matters. The label
                only — the full wording lives with the hechsherim reference. */}
            {e.hechsher.state !== "unverified" && (
              <p className={`mt-3 inline-block border-l-4 px-3 py-1.5 text-sm font-semibold leading-6 ${toneFor(e.hechsher.state)}`}>
                {hechsherLabel(e.hechsher)}
              </p>
            )}

            {e.address && <p className="mt-3 break-words text-xs leading-5 text-stone-500">{e.address}</p>}

            <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2">
              {e.coordinates && (
                <IconLink icon="directions" label="Directions" href={placeDirectionsUrl(e.address, e.coordinates)} external />
              )}
              {e.website && <IconLink icon="website" label="Website" href={e.website} external />}
              {e.phone && <IconLink icon="phone" label={`Call ${e.phone}`} href={`tel:${e.phone}`} />}
              <SuggestEditPanel targetType="site" targetId={e.slug} title={e.name} compact />
            </div>

            {/* Putting it on the trip, from the one search rather than from a
                second one further down the page. The shared hook behind this
                asks which trip when there is more than one. */}
            <div className="mt-3">
              <AddToItineraryButton
                place={{ id: e.slug, name: e.name, address: e.address, coordinates: e.coordinates }}
                label="Add to my itinerary"
                className="text-sm"
              />
            </div>
          </article>
        ))}
      </div>

      {more && (
        <div className="mt-8 text-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load({ query, country, kind, offset: rows.length })}
            className="min-h-11 border border-[var(--gold)] bg-white px-6 py-2.5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--surface)] disabled:opacity-60"
          >
            {busy ? "Loading…" : "Show more"}
          </button>
          <p className="mt-3 text-xs text-stone-500">Or search by city, country, kind or name to narrow it down.</p>
        </div>
      )}
    </>
  );
}
