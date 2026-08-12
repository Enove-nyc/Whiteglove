/**
 * The shape of a day's zmanim, and the sentence that has to travel with them.
 *
 * Nothing here calculates. lib/zmanim-day-calculate.ts does that, and it
 * carries the whole KosherJava port — so the day card, which is a client
 * component and only ever reads the answer, takes it from here instead. The
 * planner's bundle is the same size for a traveller who never turns the times
 * on. Same split, and the same reason, as lib/changes.ts and
 * lib/changes-store.ts.
 */

import type { ZmanEntry } from "@/lib/zmanim";

/** Where the traveller is at one end of a day, as much as the trip knows. */
export type DayPlaceInput = {
  /** "50.0497,19.9445" — from the stop, or the hotel. */
  coordinates?: string;
  /** Set on stops picked from the directory; used for the timezone. */
  country?: string;
};

export type ZmanimDayInput = {
  /** YYYY-MM-DD */
  date: string;
  /** Where the day begins — last night's bed. */
  morning?: DayPlaceInput;
  /** Where the night is spent. */
  evening?: DayPlaceInput;
};

export type ZmanimBlock = {
  /** "day" when one set covers it; otherwise the half it belongs to. */
  span: "day" | "morning" | "evening";
  /** "Kraków", or the country when no city is near enough to name. */
  placeName: string;
  timeZoneId: string;
  entries: ZmanEntry[];
};

export type ZmanimDay = {
  date: string;
  /** "Shabbos", "Erev Pesach", "Tzom Gedalya" — empty on an ordinary day. */
  occasion: string;
  /** True when melacha is forbidden — the day the driving plan must not ignore. */
  restDay: boolean;
  blocks: ZmanimBlock[];
  /** Why there are no blocks, when there are none. */
  unavailable?: string;
};
