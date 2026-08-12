"use client";

import { fuzzyMatch, normalize } from "@/lib/place-search";

// The search bar and filters that belong at the top of any long list.
//
// The rule this exists for: a page that lists a hundred and fifty things needs
// a way to find one of them. Scrolling is not a way to find one of them.
//
// It is only the controls — the page keeps its own markup for the list itself,
// so the look of each page stays the page's own. What is shared is the
// behaviour and the shape of the controls, so a search box means the same
// thing and sits in the same place wherever it appears.

export type ListFilter = {
  /** Shown above the select. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** "" is always offered first, with `allLabel` as its wording. */
  options: Array<{ value: string; label: string }>;
  allLabel: string;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-[var(--gold-light)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold-light)]";
const captionClass = "text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500";

export default function ListToolbar({
  query,
  onQuery,
  placeholder,
  filters = [],
  showing,
  total,
  noun,
  onReset,
}: {
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  filters?: ListFilter[];
  /** How many are on screen now, and how many there are altogether. */
  showing: number;
  total: number;
  /** What the things are called, e.g. "batei hachaim". Plural. */
  noun: string;
  /**
   * Put every control back to "everything", in one press.
   *
   * WHY A PAGE NEEDS THIS. Three selects and a search box is four places a
   * list can be narrowed from, and the way somebody ends up with an empty
   * page is by setting two of them and forgetting the first. Clearing the
   * search — which was the only recovery offered — fixed the one filter they
   * could see. Optional, so a list with a search box and nothing else does not
   * grow a button that undoes typing.
   */
  onReset?: () => void;
}) {
  const narrowed = showing !== total;
  const active = Boolean(query.trim()) || filters.some((filter) => filter.value);

  return (
    <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(auto-fit,minmax(0,1fr))]">
        <label className="block">
          <span className={captionClass}>Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            className={inputClass}
            placeholder={placeholder}
            aria-label={`Search ${noun}`}
          />
        </label>
        {filters.map((filter) => (
          <label key={filter.label} className="block">
            <span className={captionClass}>{filter.label}</span>
            <select value={filter.value} onChange={(e) => filter.onChange(e.target.value)} className={inputClass}>
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <p className="text-sm text-stone-600" role="status">
          {showing === 0 ? (
            <>
              Nothing here matches that.{" "}
              <button
                type="button"
                onClick={() => (onReset ? onReset() : onQuery(""))}
                className="underline decoration-[var(--gold)] underline-offset-2"
              >
                {onReset ? "Start again" : "Clear the search"}
              </button>
              .
            </>
          ) : narrowed ? (
            `${showing} matching ${noun}.`
          ) : (
            `All ${noun}.`
          )}
        </p>
        {/* The address bar is carrying the filters (components/useListUrl.ts),
            so a narrowed list is a link somebody can send. Said out loud,
            because a URL that changes without a page load is a thing nobody
            looks for. */}
        {onReset && active && showing > 0 && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-stone-500">This view is in the address bar — copy the link to share it.</span>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Reset filters
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Does this entry match what was typed?
 *
 * THIS USED TO BE ITS OWN MATCHER — accent-folded substring, every word had to
 * appear — while the planner and /stops used the spelling-tolerant one in
 * lib/place-search. Two matchers meant the same query gave two answers:
 * "Colosseom" found the Colosseum in the planner and nothing at all on the
 * page that lists it, and "Lezajsk" found Lizhensk on /stops and nothing on
 * /cemeteries. The page a visitor actually browses was the one that could not
 * spell.
 *
 * So this now delegates. Everything the site searches goes through one matcher,
 * and a fix to it fixes every page at once.
 */
export function listMatches(haystack: string, needle: string): boolean {
  return fuzzyMatch(needle, haystack);
}

/**
 * How close a hit is to what was typed, lower being closer. Sort by this only
 * while there IS a query — with an empty box the page's own order is the right
 * one, and a relevance sort would scramble it for nothing.
 *
 * The city is compared whole and BEFORE the name, for the reason recorded in
 * lib/attraction-search.ts: substring-scoring the two together ranked the
 * Promenade des Anglais as a strong hit for "Rome", because "P-rome-nade"
 * contains it, and a search for Rome opened in Nice.
 */
export function listRank(query: string, city: string, name: string): number {
  const nq = normalize(query);
  if (!nq) return 0;
  if (normalize(city) === nq) return 0;
  if (normalize(city).startsWith(nq)) return 1;
  if (normalize(name).includes(nq)) return 2;
  return 3;
}
