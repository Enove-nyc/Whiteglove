import type { SavedPlace } from "@/data/route-utils";
import { type BorderAdvice, type Crossing, borderAdvice } from "@/lib/border-crossings";

/**
 * Where a route crosses a border, and which crossings actually cost a day.
 *
 * These trips cross the Schengen edge constantly — Poland into Ukraine is the
 * single most common leg on this site — and that crossing is not a formality.
 * Queues of several hours are ordinary and queues of much longer are not
 * unusual. A planner that works out driving time from road distance and says
 * nothing about the border has quietly told somebody a five-hour drive is
 * five hours.
 *
 * The wait is not predicted, because it is not predictable. What is said is
 * that the crossing is there and that it can take hours, which is the part
 * that changes what somebody plans.
 */

/**
 * Inside the Schengen area, where an internal crossing is normally
 * drive-through. Countries the destination data actually contains.
 */
const SCHENGEN = new Set([
  "Poland", "Germany", "Austria", "Czechia", "Czech Republic", "Slovakia", "Hungary",
  "Italy", "France", "Switzerland", "Netherlands", "Belgium", "Spain", "Portugal",
  "Greece", "Lithuania", "Slovenia", "Croatia", "Latvia", "Estonia", "Denmark",
  "Sweden", "Norway", "Finland", "Luxembourg", "Malta", "Iceland", "Liechtenstein",
]);

/** Spellings that mean the same country, so a route does not "cross" into itself. */
const ALIASES: Record<string, string> = {
  "UK": "United Kingdom",
  "Great Britain": "United Kingdom",
  "Czech Republic": "Czechia",
  "Israel / Judea": "Israel",
  "USA": "United States",
  "US": "United States",
};

const KNOWN = [
  "Poland", "Ukraine", "Italy", "Israel", "France", "Germany", "Switzerland",
  "Austria", "United States", "USA", "Hungary", "United Kingdom", "UK", "Czechia",
  "Czech Republic", "Spain", "Netherlands", "Belgium", "Belarus", "Slovakia",
  "Romania", "Greece", "Lithuania", "Morocco", "Turkey", "UAE", "Moldova",
  "Canada", "Qatar", "Portugal", "Latvia", "Estonia", "Slovenia", "Croatia",
];

function canonical(name: string): string {
  const trimmed = name.trim();
  return ALIASES[trimmed] ?? trimmed;
}

/**
 * Which country a saved stop is in.
 *
 * Prefers a country the record states. Falls back to reading the address,
 * because routes saved before stops carried a country still need to work —
 * and an address on this site ends with its country nearly always.
 */
export function countryOf(place: Pick<SavedPlace, "address"> & { country?: string }): string | null {
  if (place.country?.trim()) return canonical(place.country);
  const address = place.address ?? "";
  // Longest first, so "Czech Republic" is not read as nothing and "United
  // Kingdom" is not missed because "UK" matched somewhere else.
  for (const name of [...KNOWN].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`(^|[,\\s])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$|${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*,`, "i").test(address)) {
      return canonical(name);
    }
  }
  return null;
}

export type BorderCrossing = {
  from: string;
  to: string;
  fromPlace: string;
  toPlace: string;
  /** True when it leaves or enters the Schengen area — the ones that queue. */
  major: boolean;
  message: string;
  /**
   * Which crossings are on this border and what has been checked on them.
   *
   * Absent when nothing was passed in, which is every caller that only wants
   * to know a border is there. The message above never depends on it — a
   * border takes time whether or not anybody looked this week.
   */
  advice?: BorderAdvice;
};

/**
 * Every border a route crosses, in order.
 *
 * Consecutive stops in the same country produce nothing. A stop whose country
 * cannot be worked out is skipped rather than guessed at — announcing a
 * crossing that is not there would train somebody to ignore the warnings.
 */
export function borderCrossings(
  places: Array<Pick<SavedPlace, "name" | "address"> & { country?: string }>,
  known?: { crossings: Crossing[]; today: string },
): BorderCrossing[] {
  const crossings: BorderCrossing[] = [];
  let previous: { country: string; name: string } | null = null;

  for (const place of places) {
    const country = countryOf(place);
    if (!country) continue;
    if (previous && previous.country !== country) {
      const major = SCHENGEN.has(previous.country) !== SCHENGEN.has(country);
      const advice = known
        ? borderAdvice({ from: previous.country, to: country, major, all: known.crossings, today: known.today })
        : undefined;
      crossings.push({
        from: previous.country,
        to: country,
        fromPlace: previous.name,
        toPlace: place.name,
        major,
        message: major
          ? `Border crossing between ${previous.country} and ${country}, on the way from ${previous.name} to ${place.name}. This is an external EU border — allow several hours, and more at the end of a week or around a yom tov. Passports for everyone travelling.`
          : `Border crossing between ${previous.country} and ${country}, on the way from ${previous.name} to ${place.name}. Normally drive-through, but carry passports.`,
        advice,
      });
    }
    previous = { country, name: place.name };
  }
  return crossings;
}
