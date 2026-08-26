/**
 * When Pesach and Sukkos actually fall, so the site does not have to be told.
 *
 * WHY THIS IS COMPUTED RATHER THAN TYPED IN. A hand-entered window is right for
 * one year and silently wrong for every year after it: the owner would have to
 * remember, each autumn, to move three pairs of dates, and the failure when he
 * forgets is a Pesach prompt in June. The Jewish calendar is in the bundle
 * already — kosher-zmanim, the same library the zmanim pages use — so the
 * dates are read from it and are right in 2031 without anybody touching them.
 *
 * THIS IS NOT INVENTING DATES. It states when Yom Tov is, which is a fact of
 * the calendar, and it never states that anything is running, available or
 * priced. What it produces is a window in which a link to an existing category
 * is worth showing — see the top of data/seasonal-spotlight.ts.
 *
 * YESHIVA WEEK IS NOT IN HERE, and that is the honest answer rather than a gap.
 * It is not a date on the calendar: it is when the yeshivos happen to break,
 * which varies by yeshiva and by year. Guessing it from Tu BiShvat would be
 * making something up. So it has no derived window, and appears only if the
 * owner sets one — which he can, because he knows when it is.
 *
 * THE RUN-UP IS TEN WEEKS because that is when the question starts being asked,
 * not because anything happens then. Somebody deciding where to spend Yom Tov
 * is looking two to three months out; a window that opened a fortnight before
 * would be a prompt arriving after the decision.
 */

import { JewishCalendar } from "kosher-zmanim";
import type { SeasonalWindow, SpotlightKey } from "@/data/seasonal-spotlight";

/** How long before Yom Tov the category is worth putting in front of somebody. */
const RUN_UP_DAYS = 70;

/** Yom Tov itself is over in a week or so; the window closes with it. */
const TAIL_DAYS = 9;

const YOM_TOV_INDEX: Partial<Record<SpotlightKey, number>> = {
  // Both are static members of JewishCalendar, read by name rather than as
  // numbers so an upstream renumbering cannot quietly shift the window.
  pesach: (JewishCalendar as unknown as { PESACH: number }).PESACH,
  sukkos: (JewishCalendar as unknown as { SUCCOS: number }).SUCCOS,
};

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shift(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return iso(date);
}

/**
 * The first day of the next Yom Tov of this kind, on or after `from`.
 *
 * Walks a day at a time, which is the least clever way and the one that cannot
 * be wrong about a leap year: 400 days is more than one Jewish year, so the
 * answer is always found.
 */
export function nextYomTov(key: SpotlightKey, from: string): string | null {
  const index = YOM_TOV_INDEX[key];
  if (index === undefined) return null;
  const date = new Date(`${from}T12:00:00Z`);
  for (let i = 0; i < 400; i += 1) {
    if (new JewishCalendar(date).getYomTovIndex() === index) return iso(date);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return null;
}

/**
 * The windows the calendar gives us for today, before the owner's own.
 *
 * Looks back from ten weeks ago so that a Yom Tov already under way is still
 * found: on the second day of Pesach the next Pesach is a year off, and a
 * window that only ever looked forward would have closed the moment it
 * mattered most.
 */
export function derivedWindows(today: string): SeasonalWindow[] {
  const out: SeasonalWindow[] = [];
  for (const key of ["pesach", "sukkos"] as const) {
    const yomTov = nextYomTov(key, shift(today, -TAIL_DAYS));
    if (!yomTov) continue;
    out.push({
      key,
      startsOn: shift(yomTov, -RUN_UP_DAYS),
      endsOn: shift(yomTov, TAIL_DAYS),
      active: true,
      featured: false,
      note: "",
      derived: true,
    });
  }
  return out;
}
