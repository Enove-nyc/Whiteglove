"use client";

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
}) {
  const narrowed = showing !== total;

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

      <p className="mt-3 text-sm text-stone-600" role="status">
        {showing === 0 ? (
          <>
            Nothing here matches that. <button type="button" onClick={() => onQuery("")} className="underline decoration-[var(--gold)] underline-offset-2">Clear the search</button>.
          </>
        ) : narrowed ? (
          `${showing} of ${total} ${noun}.`
        ) : (
          `${total} ${noun}.`
        )}
      </p>
    </div>
  );
}

/** Case-insensitive, accent-insensitive contains — so "krakow" finds "Kraków". */
export function listMatches(haystack: string, needle: string): boolean {
  const flatten = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = flatten(needle.trim());
  if (!q) return true;
  const hay = flatten(haystack);
  // Every word has to appear, so "sanz poland" narrows rather than widens.
  return q.split(/\s+/).every((word) => hay.includes(word));
}
