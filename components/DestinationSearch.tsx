"use client";

import { BUILT_IN_WORDS } from "@/data/site-words";
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BilingualLabel from "@/components/BilingualLabel";
import { destinationHref, guidedDestinations } from "@/data/destinations";
import type { SiteHit } from "@/lib/site-search";

// The search bar in the navbar, on every page.
//
// IT USED TO KNOW ABOUT TWO THINGS. It searched destinations and batei
// hachaim, because those were all the site had when it was written. Everything
// added since — attractions, places to stay, quarters, places to eat — went
// onto its own page and into /stops, and nobody came back to the bar. So
// "Colosseum" and "Merano" and "Kosher Tirol" all answered "No match yet" in a
// box on every page, while /stops found all three one Enter away.
//
// It now asks /api/search, which searches everything. That also fixes what it
// was doing to get its answers: this is a client component, and it was
// importing the entire cemetery database into the browser so it could filter
// it in the dropdown. Every visitor downloaded every kever on the site in order
// to type into a box.
//
// The guided destinations stay in the bundle, because they are what the empty
// box offers before anybody types and a network round trip to show a default
// list would be worse than carrying a short one.

type Suggestion = Pick<SiteHit, "id" | "kind" | "title" | "yiddish" | "subtitle" | "href">;

const defaultSuggestions: Suggestion[] = guidedDestinations()
  .slice(0, 5)
  .map((guide) => ({
    id: `destination-${guide.slug}`,
    kind: "Guide" as const,
    title: guide.city,
    yiddish: guide.yiddishCity,
    subtitle: guide.guide?.tzaddik ? `${guide.guide.tzaddik} · ${guide.country}` : guide.country,
    href: destinationHref(guide),
  }));

/**
 * `found` is how many results were on screen when they searched.
 *
 * Sent because zero is the number worth knowing: it means somebody asked for a
 * town or a kever by name and this site had never heard of it. Counted at the
 * moment it happens rather than worked out later, so what the owner reads is
 * what the visitor was actually shown.
 */
function recordSearch(value: string, found: number) {
  if (!value.trim()) return;
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "search", value: value.trim(), found }),
    keepalive: true,
  });
}

export default function DestinationSearch({
  compact = false,
  placeholder = BUILT_IN_WORDS.searchPlaceholder,
  ariaLabel = "Search the site",
}: {
  compact?: boolean;
  placeholder?: string;
  /**
   * What this particular box is for.
   *
   * The header carries the site-wide one and is named "Search the site". A
   * page that offers a second box — the heritage landing page, whose search is
   * the whole point of it — must say what THAT one searches: two controls with
   * the same accessible name on one page is a real problem for anybody
   * navigating by them, and it is also how the audit tells an intentional
   * second search from an accidental duplicate.
   */
  ariaLabel?: string;
}) {
  const router = useRouter();
  // A page may carry two of these — the header's and the heritage page's own —
  // and two elements sharing an id is how aria-controls starts pointing at the
  // wrong list.
  const listId = `${useId()}-search-results`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // The results are stored WITH the query they answer, so which list belongs
  // on screen is derived rather than cleared. Clearing it in an effect meant a
  // render pass whose only job was to blank the list, and a slow reply to "ro"
  // could still land after the reply to "rome".
  const [hits, setHits] = useState<{ query: string; results: Suggestion[] } | null>(null);
  // Which row the arrow keys are on. -1 means "none", and Enter then does what
  // it always did: go to the first result, or to the full directory.
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const matches = useMemo(
    () => (trimmed ? (hits?.query === trimmed ? hits.results : []) : defaultSuggestions),
    [trimmed, hits],
  );
  const searching = Boolean(trimmed) && hits?.query !== trimmed;

  // One request per pause in typing, and a request that is no longer wanted is
  // aborted rather than allowed to answer.
  useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((payload: { results?: Suggestion[] }) => setHits({ query: trimmed, results: payload.results ?? [] }))
        .catch(() => {
          // An aborted request is the normal case here, not a failure.
          if (!controller.signal.aborted) setHits({ query: trimmed, results: [] });
        });
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const blurTimer = useRef<number | undefined>(undefined);

  function go(hit: Suggestion) {
    recordSearch(query, matches.length);
    router.push(hit.href);
    setOpen(false);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    recordSearch(query, matches.length);
    const chosen = active >= 0 ? matches[active] : query.trim() ? matches[0] : undefined;
    if (chosen) router.push(chosen.href);
    else router.push(`/stops${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    setOpen(false);
  }

  // Arrow keys through the list, Escape to close. The dropdown had no keyboard
  // path at all before this: a person navigating by keyboard could type into
  // the box and never reach a result.
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || matches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    }
  }

  return (
    <div className={`relative ${compact ? "w-full" : "mt-12 max-w-3xl"}`}>
      <form className={`flex flex-col gap-2 rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:flex-row ${compact ? "p-2" : "p-3"}`} onSubmit={submitSearch}>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // Reset the keyboard cursor here rather than in an effect: typing
            // is the event that invalidates it, so this is where it belongs.
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          className={`min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-stone-400 ${compact ? "min-h-11 py-2 text-sm" : "min-h-11 py-3"}`}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          aria-controls={listId}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className={`rounded-xl bg-[var(--navy)] text-sm font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[var(--gold)] ${compact ? "min-h-11 px-4 py-2 text-xs" : "min-h-11 px-7 py-3"}`} type="submit">
          {compact ? "Search" : "Explore"}
        </button>
      </form>

      {open && (
        <div id={listId} role="listbox" className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] shadow-xl">
          {matches.length > 0 ? (
            matches.map((match, index) => (
              <button
                key={match.id}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  window.clearTimeout(blurTimer.current);
                }}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(match)}
                className={`flex w-full items-center justify-between gap-5 border-b border-[var(--gold-light)] px-5 py-4 text-left last:border-b-0 transition hover:bg-[var(--cream-deep)] ${index === active ? "bg-[var(--cream-deep)]" : ""}`}
              >
                <div className="min-w-0">
                  {match.yiddish ? (
                    <BilingualLabel primary={match.yiddish} secondary={match.title} primaryClassName="text-3xl" secondaryClassName="text-base" compact />
                  ) : (
                    <p className="text-base font-semibold text-[var(--navy)]">{match.title}</p>
                  )}
                  <p className="mt-2 text-sm leading-6 text-stone-600">{match.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{match.kind}</span>
              </button>
            ))
          ) : (
            <p className="px-5 py-4 text-sm text-stone-600">
              {searching ? "Searching…" : "No match yet. Press Enter to search the full directory."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
