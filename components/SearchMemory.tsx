"use client";

import { useEffect } from "react";
import {
  DATED,
  decodeMemory,
  encodeMemory,
  FILLABLE,
  fillValues,
  SEARCH_MEMORY_KEY,
  todayIso,
} from "@/lib/search-memory";
import type { StaySearch } from "@/lib/stay-search";

/**
 * Carries a search from one page to the next.
 *
 * TWO JOBS, AND THE ORDER MATTERS. When a page was reached by searching, that
 * search is written down. Then every form on the page that has opted in gets
 * its EMPTY fields filled from what is remembered. Writing first means the
 * search you just made wins over the one you made last week.
 *
 * EMPTY FIELDS ONLY. A field the server filled in — the destination on a
 * destination page, the dates carried in the URL — is the more specific
 * answer and is never overwritten. This only ever adds what was missing.
 *
 * WHY IT WRITES TO THE DOM RATHER THAN LIFTING THE FORMS INTO STATE. The forms
 * are plain HTML on purpose: they submit before hydration, on a slow phone,
 * with scripts blocked, and that is the property worth protecting on the one
 * path where the site earns anything. Making them controlled to support a
 * convenience would trade the guarantee for the garnish. The inputs are
 * uncontrolled, so setting `.value` is exactly what a browser autofill does.
 *
 * IT RENDERS NOTHING and it never blocks anything. localStorage throws in a
 * locked-down browser and in private mode on some phones; every access here is
 * wrapped, and a failure means the fields stay empty, which is where they
 * started.
 */
export default function SearchMemory({ remember }: { remember?: StaySearch }) {
  useEffect(() => {
    const today = todayIso(new Date());

    // THE FLOOR ON THE DATE FIELDS, before anything else and whether or not
    // there is a search to restore.
    //
    // The opted-in forms are plain HTML rendered on the server, so the `min`
    // they carry is the day the page was rendered — which on a prerendered
    // page is the day it was built. Nobody flies last Tuesday, and a partner
    // opened on a date that has gone is the same lost referral as one opened
    // on no date at all. This is the only place on those forms that knows what
    // day it is in the visitor's own browser, so it is the place that says so.
    //
    // Only ever tightened, never loosened: a form that already asks for a
    // later date than today — a check-out that must follow a check-in — keeps
    // its own, because that one is the more specific rule.
    for (const form of document.querySelectorAll<HTMLFormElement>("form[data-search-memory]")) {
      for (const field of DATED) {
        const input = form.elements.namedItem(field);
        if (!(input instanceof HTMLInputElement) || input.type !== "date") continue;
        if (!input.min || input.min < today) input.min = today;
      }
    }

    if (remember && (remember.destination || remember.checkIn)) {
      try {
        localStorage.setItem(SEARCH_MEMORY_KEY, encodeMemory(remember));
      } catch {
        // No storage. The rest of this still works for this page.
      }
    }

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(SEARCH_MEMORY_KEY);
    } catch {
      return;
    }

    const search = decodeMemory(stored, today);
    if (!search) return;
    const values = fillValues(search);

    for (const form of document.querySelectorAll<HTMLFormElement>("form[data-search-memory]")) {
      for (const field of FILLABLE) {
        const value = values[field];
        if (!value) continue;
        const input = form.elements.namedItem(field);
        if (!(input instanceof HTMLInputElement)) continue;
        if (input.value) continue;
        input.value = value;
      }
    }
  }, [remember]);

  return null;
}
