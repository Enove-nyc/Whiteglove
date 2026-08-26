"use client";

import { useEffect, useState } from "react";

/**
 * A search box that waits for you to stop typing.
 *
 * SIX OF THESE WERE WRITTEN OUT BY HAND — four pickers inside the itinerary
 * builder alone, plus the library's own search and the address box — and every
 * one had the same two flaws.
 *
 * THE FIRST is what the lint rule caught: results were cleared synchronously
 * at the top of the effect when the query got too short, which is a setState
 * during the effect. The obvious repair is to move that clear behind the
 * debounce timer, and it is the wrong one — results for a query you had
 * already deleted would sit on screen for the length of the debounce, under
 * whatever you typed next.
 *
 * THE SECOND was there before the rule existed and is worse. Rows lived in
 * state with no record of what they answered, so between one keystroke and the
 * reply to it, the box showed the PREVIOUS query's rows under the current
 * text. Not a frame — the whole debounce plus a round trip, every time.
 *
 * KEEPING THE QUESTION WITH THE ANSWER fixes both, and removes the "searching"
 * flag as a side effect: searching is not a thing to remember to raise and
 * lower, it is simply not yet having the answer to what is in the box.
 *
 * `search` MUST BE STABLE — declare it at module scope or wrap it in
 * useCallback. It is in the dependency list because leaving it out would be a
 * lie about what this depends on; a function rebuilt every render would
 * restart the debounce every render, which is the failure this is meant to
 * prevent.
 */
export function useDebouncedSearch<T>(
  query: string,
  options: {
    /** Below this many characters, nothing is searched and nothing is shown. */
    minLength: number;
    /** How long to wait after the last keystroke. */
    delayMs: number;
    /** Stable. Rejections are treated as "no results", never as a stuck box. */
    search: (query: string) => Promise<T[]>;
  },
): { results: T[]; searching: boolean } {
  const { minLength, delayMs, search } = options;
  const [answered, setAnswered] = useState<{ query: string; rows: T[] }>({ query: "", rows: [] });

  const trimmed = query.trim();
  const tooShort = trimmed.length < minLength;
  const results = !tooShort && answered.query === trimmed ? answered.rows : [];
  const searching = !tooShort && answered.query !== trimmed;

  useEffect(() => {
    // The short-query case has no effect to run: it is already answered by
    // `results` above, so nothing here happens synchronously.
    if (tooShort) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const rows = await search(trimmed);
        if (active) setAnswered({ query: trimmed, rows });
      } catch {
        // A failed lookup answers the query with nothing. Leaving the previous
        // rows would show them under a query they do not answer; leaving
        // `searching` true would spin for ever with no way out.
        if (active) setAnswered({ query: trimmed, rows: [] });
      }
    }, delayMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmed, tooShort, delayMs, search]);

  return { results, searching };
}
