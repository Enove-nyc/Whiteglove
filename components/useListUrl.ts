"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A long list's filters, kept in the address bar.
 *
 * WHY THIS EXISTS. /hotels and /things-to-do filter in the browser, which is
 * right — the whole list is already on the page and a round trip per keystroke
 * would be slower and worse. What it cost was everything an address gives you:
 * a filtered list could not be sent to anybody, could not be bookmarked, and
 * was lost the moment somebody opened an entry and pressed back. "Look at the
 * Austrian ones" was a sentence you could say and not a link you could send.
 *
 * HOW IT BEHAVES, and the two rules that matter:
 *
 *   • It reads the address ONCE, after mount. Reading during render would make
 *     the server's HTML and the browser's first paint disagree, which React
 *     reports as a hydration error and repairs by throwing the markup away.
 *   • It writes with replaceState, not pushState. A filter is not a page: with
 *     pushState, back would walk the visitor through every letter they typed
 *     into the search box before it took them off the page.
 *
 * Keys are the caller's, so a page whose server component already reads
 * `destination` and `checkin` from the same address is unaffected — only the
 * keys named in `defaults` are ever touched, and a value equal to its default
 * is removed rather than written, so a pristine list has a clean URL.
 */
export function useListUrl<K extends string>(
  defaults: Record<K, string>,
): [Record<K, string>, (patch: Partial<Record<K, string>>) => void, () => void] {
  const [state, setState] = useState<Record<K, string>>(defaults);
  // The defaults are a fresh object literal on every render at every call
  // site, so they are held in a ref rather than listed as an effect
  // dependency — otherwise the read-once effect runs on every render and
  // fights whatever the visitor has just typed.
  const initial = useRef(defaults);
  const mounted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...initial.current };
    let found = false;
    for (const key of Object.keys(initial.current) as K[]) {
      const value = params.get(key);
      // A cap, because this is somebody else's text arriving in an address:
      // it is only ever compared and printed into a form field, never
      // rendered as markup, but an unbounded string in a select is still not
      // something to keep.
      if (value !== null) {
        next[key] = value.slice(0, 80);
        found = true;
      }
    }
    mounted.current = true;
    if (found) setState(next);
  }, []);

  const write = useCallback((values: Record<K, string>) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    for (const key of Object.keys(initial.current) as K[]) {
      if (values[key] && values[key] !== initial.current[key]) params.set(key, values[key]);
      else params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, []);

  const update = useCallback(
    (patch: Partial<Record<K, string>>) => {
      setState((current) => {
        const next = { ...current, ...patch };
        if (mounted.current) write(next);
        return next;
      });
    },
    [write],
  );

  const reset = useCallback(() => {
    setState(() => {
      if (mounted.current) write(initial.current);
      return { ...initial.current };
    });
  }, [write]);

  return [state, update, reset];
}

/** Whether anything is narrowing the list — what the reset control keys off. */
export function anyActive<K extends string>(state: Record<K, string>, defaults: Record<K, string>): boolean {
  return (Object.keys(defaults) as K[]).some((key) => state[key] !== defaults[key]);
}
