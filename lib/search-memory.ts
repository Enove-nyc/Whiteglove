/**
 * Remembering what somebody already typed.
 *
 * THE PROBLEM IT SOLVES. A visitor types Rome, two dates and five people on
 * the front page. They land on /hotels, read which quarter to be in, open the
 * Rome destination page, decide a car is worth it, and press Cars — and the
 * car form asks for the dates again. So does the flight form. So does the
 * partner hand-off if they come back to it later. Every one of those is a
 * place the journey ends, and the site had the answer the whole time.
 *
 * IT IS AN ENHANCEMENT AND NEVER A DEPENDENCY. The forms are plain HTML that
 * work before hydration and with scripts blocked — that is deliberate, it is
 * the money path (components/PartnerSearchForm.tsx). This adds nothing to that
 * contract: with no JavaScript the fields are simply empty, exactly as they
 * were. Nothing here is required for a search to work.
 *
 * WHAT IS REMEMBERED, AND WHAT IS NOT. A destination, two dates and a party
 * size. NOT the kosher standard, the Shabbos requirement, the hechsherim, or
 * anything about how somebody keeps — those are asked for in the planning flow
 * to do the trip's work, and lib/affiliate/clicks.ts already refuses to carry
 * them into a click record. A stored profile of religious practice is not
 * something this site keeps in order to fill in a date field faster.
 *
 * STALE DATES ARE NOT FILLED IN, and that rule is the reason this file has a
 * clock in it. Somebody who searched in March and comes back in July must not
 * have March quietly typed into a partner search — they would be sent to a
 * booking site for dates that have gone, and it would look like the site's
 * fault. A remembered check-in that has passed is dropped.
 */

import { readStaySearch, staySearchHref, type StaySearch } from "@/lib/stay-search";

/** Where it lives. Versioned, so a shape change cannot be misread as data. */
export const SEARCH_MEMORY_KEY = "whiteGloveSearch.v1";

/**
 * Stored as a query string, which is the same vocabulary /hotels and /go read.
 *
 * One format from the front-page form, through the address bar, into storage
 * and back out. A JSON blob here would be a second shape to keep in step with
 * the first, and the two would drift.
 */
export function encodeMemory(search: StaySearch): string {
  return staySearchHref(search).split("?")[1] ?? "";
}

/**
 * What was stored, clamped by the same reader the URL goes through.
 *
 * `today` is passed in rather than read from a clock so this is testable and
 * so a server render can never disagree with a client one about what "past"
 * means.
 */
export function decodeMemory(raw: string | null, today: string): StaySearch | null {
  if (!raw) return null;
  const search = readStaySearch(Object.fromEntries(new URLSearchParams(raw)));
  const usable = { ...search };
  // The rule this module exists for: a date that has been and gone is worse
  // than no date at all.
  //
  // BOTH GO, and only the check-in is tested. readStaySearch guarantees the
  // check-out follows the check-in, so a stale check-out cannot exist beside a
  // fresh check-in — and half a range is worse than none, because it opens the
  // partner on one date and asks for the other. A visitor searching in the
  // middle of their own trip gets the destination and two empty dates.
  if (usable.checkIn && usable.checkIn < today) {
    usable.checkIn = "";
    usable.checkOut = "";
  }
  // Nothing worth filling in.
  if (!usable.destination && !usable.checkIn && !usable.checkOut) return null;
  return usable;
}

/** Today, as the date inputs spell it. */
export function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * The field names this may fill, and nothing else.
 *
 * An allow-list rather than "every empty input in the form". A form on this
 * site can hold a name, an email or a message, and a component that helpfully
 * refills whatever it finds is one refactor away from putting somebody's
 * details into a field they did not expect.
 *
 * THE PARTY SIZE IS NOT IN THIS LIST, and that is a consequence of the
 * empty-fields-only rule rather than a judgement about whether it is useful.
 * Every form renders "2 adults, 0 children, 1 room" as its own default, so
 * those fields are never empty and could only be filled by overwriting a value
 * already on the screen. Overwriting is the behaviour that turns a convenience
 * into a bug — it changes an answer the visitor can see without being asked.
 * Measured in a browser: the destination and the dates are the fields worth
 * carrying, and they are the ones that are genuinely blank on arrival.
 *
 * The party size is still STORED, because the store is the search as the URL
 * spells it and keeping a second, narrower shape is how two formats drift.
 */
export const FILLABLE = ["destination", "in", "out"] as const;

export type FillableField = (typeof FILLABLE)[number];

/** What to put in each field, given what is remembered. Empty means leave it. */
export function fillValues(search: StaySearch): Record<FillableField, string> {
  return {
    destination: search.destination,
    in: search.checkIn,
    out: search.checkOut,
  };
}
