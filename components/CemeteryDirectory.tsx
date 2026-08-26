"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ListToolbar from "@/components/ListToolbar";
import { PAGE, type CemeteryRow, type Order } from "@/data/cemetery-list";

// The batei hachaim directory, with a way to find one in it.
//
// A hundred and fifty-odd cards in one grid is not a directory, it is a wall.
// Somebody who knows they want Sanz, or wants everything in Hungary, or is
// looking for the Chozeh without remembering which town he is in, had nothing
// to do but scroll.
//
// So: search across the town, the country and the names of everybody buried
// there — in English or Yiddish — plus a country filter and a choice of order.
// Each card is just the names of the place — Yiddish and English, town and
// country — and the whole card is the link; the kevarim themselves, the
// counts and everything else live on the detail page.
//
// ONE DIRECTORY, ONE LIST. There used to be a second browser lower on the page
// — the Nesiya Tova "batei hachaim worldwide" locator, with its own country
// dropdowns — so the page asked you to pick a country twice. Then the two
// browsers became one search but still drew two grids: the guides, then a
// divided-off "located" section under them. Now it is a single list. The
// curated kevarim guides (rich cards, ~150) are what you see by default, and
// the moment you search a town or choose a country the located grounds join
// the SAME grid for that place, sorted in among the guides rather than fenced
// off below them. The located set stays out of the default view on purpose —
// nearly two thousand location-only entries would bury the guides — and never
// carries a per-card source line; a located card is marked "Location" and its
// own detail page forwards to Nesiya Tova for the details.

/** Long enough that a typed town name is one request, short enough to feel live. */
const SETTLE_MS = 250;

/**
 * WHERE THE CHOOSING HAPPENS: on the server, see data/cemetery-list.ts. This
 * page used to hold both sets to search and merge them in the browser — 242
 * guides with every name buried in each, and 1,952 located grounds, 576KB of
 * JSON — to draw cards showing a town and a country. The first page is
 * rendered by the server; every later search asks /api/cemeteries/list.
 *
 * The selection rules did not change, they moved: the merge, the four orders,
 * the rule that keeps the located set out of the default view, and the town
 * matching that stops a guide and a located ground reading as the same place
 * twice.
 */
export default function CemeteryDirectory({
  initial,
  initialMore,
  initialNarrowed,
  countries: countryNames,
  hasHeritage,
  initialCountry = "",
}: {
  initial: CemeteryRow[];
  initialMore: boolean;
  initialNarrowed: boolean;
  countries: string[];
  /** Whether there is a located set at all, for the line that offers it. */
  hasHeritage: boolean;
  /**
   * Arrived from "Browse by country" on the heritage landing page.
   *
   * A prop rather than a query the component reads for itself, so this stays
   * the same self-contained filter it has always been and the page above it
   * decides what a link means.
   */
  initialCountry?: string;
}) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState(initialCountry);
  const [order, setOrder] = useState<Order>("city");
  const [rows, setRows] = useState<CemeteryRow[]>(initial);
  const [more, setMore] = useState(initialMore);
  const [narrowed, setNarrowed] = useState(initialNarrowed);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Which request the answer on screen belongs to: a slow early request must
  // not overwrite a later, faster one.
  const asked = useRef(0);
  // The server already rendered the first page.
  const mounted = useRef(false);

  const countries = useMemo(() => countryNames.map((value) => ({ value, label: value })), [countryNames]);

  async function load(next: { query: string; country: string; order: Order; offset: number }) {
    const mine = ++asked.current;
    setBusy(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), offset: String(next.offset), order: next.order });
      if (next.query) params.set("q", next.query);
      if (next.country) params.set("country", next.country);
      const res = await fetch(`/api/cemeteries/list?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { rows?: CemeteryRow[]; more?: boolean; narrowed?: boolean };
      if (mine !== asked.current) return;
      if (!res.ok || !data.rows) {
        setFailed(true);
        return;
      }
      setRows((prev) => (next.offset ? [...prev, ...data.rows!] : data.rows!));
      setMore(Boolean(data.more));
      setNarrowed(Boolean(data.narrowed));
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
    const timer = setTimeout(() => void load({ query, country, order, offset: 0 }), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [query, country, order]);

  const showsLocated = rows.some((r) => r.kind === "located");

  return (
    <>
      <ListToolbar
        query={query}
        onQuery={setQuery}
        placeholder="Town, country, or who is buried there — Sanz, Kraków, קאָװנע, the Chozeh…"
        searchLabel="Search batei hachaim"
        empty={rows.length === 0 && !busy && !failed}
        mapHref="/map"
        filters={[
          { label: "Country", value: country, onChange: setCountry, options: countries, allLabel: "Everywhere" },
          {
            label: "Order",
            value: order === "city" ? "" : order,
            onChange: (v) => setOrder((v || "city") as Order),
            allLabel: "By town",
            options: [
              { value: "country", label: "By country" },
              { value: "tzaddik", label: "By tzaddik" },
              { value: "kevarim", label: "Most kevarim first" },
            ],
          },
        ]}
      />

      {/* A located ground opens with directions only, and many are locked, so
          the caveat is said once above the one list rather than fencing them
          off into a directory of their own. */}
      {showsLocated && (
        <p className="mt-8 max-w-3xl text-sm leading-6 text-stone-500">
          Entries marked <span className="font-semibold text-[var(--gold-ink)]">Location</span> open with directions
          only — many grounds are locked, so confirm access before travelling.
        </p>
      )}

      {failed && (
        <p role="status" className="mt-5 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The search could not be reached just now. Try again in a moment.
        </p>
      )}

      <div className={`mt-6 grid gap-5 md:grid-cols-2 ${busy ? "opacity-60" : ""}`}>
        {rows.map((result) =>
          result.kind === "guide" ? (
            <Link
              key={result.slug}
              href={`/cemeteries/${result.slug}`}
              className="min-w-0 border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7"
            >
              <h2 dir="rtl" lang="yi" className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-4xl">{result.yiddishName}</h2>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{result.name}</p>
              <p className="mt-3 break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">{result.city} · {result.country}</p>
            </Link>
          ) : (
            <Link
              key={`h-${result.slug}`}
              href={`/cemeteries/heritage/${result.slug}`}
              className="flex min-w-0 flex-col justify-between border border-dashed border-[var(--gold-light)] bg-[var(--surface)] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7"
            >
              <div className="min-w-0">
                <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-3xl">{result.city}</h2>
                {/* The street, because a town can hold two of these and the
                    town name alone made them look like the same card twice.
                    Kalisz has one ground on Nowy Świat and another on
                    Podmiejska; this is what tells them apart. */}
                {result.address && (
                  <p className="mt-2 break-words text-sm leading-6 text-stone-600">{result.address}</p>
                )}
                <p className="mt-3 break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] sm:tracking-[0.18em]">{result.country}</p>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Location</p>
            </Link>
          ),
        )}
      </div>

      {/* The list used to draw every guide it had, so nothing needed a button.
          It is paged now, and without this the guides past the first page
          would simply not be reachable. */}
      {more && (
        <div className="mt-10 text-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load({ query, country, order, offset: rows.length })}
            className="min-h-11 border border-[var(--gold)] bg-white px-6 py-2.5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--surface)] disabled:opacity-60"
          >
            {busy ? "Loading…" : "Show more"}
          </button>
        </div>
      )}

      {/* Nothing typed and no country chosen: say the located set is there, and
          how to bring it in — without a count, and without a wall of it. */}
      {!narrowed && hasHeritage && (
        <p className="mt-10 max-w-3xl border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-5 py-4 text-sm leading-6 text-stone-600">
          Search a town or choose a country to include the batei hachaim located worldwide from Nesiya Tova. Many grounds
          are locked; confirm access before travelling.
        </p>
      )}
    </>
  );
}
