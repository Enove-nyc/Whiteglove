/**
 * What the site is missing, and what each gap actually costs a traveler.
 *
 * NOT ANOTHER CHECKLIST. `/admin/inventory` is a hand-kept list of pages and
 * issues the owner writes notes against, and `/admin/reports` says which empty
 * pages people are opening. Neither reads the content itself. This counts the
 * real records — 767 things to do, 1,466 food listings, 242 batei hachaim —
 * and says which fields are absent across them.
 *
 * ORDERED BY WHAT IT COSTS, NOT BY HOW MANY. A gap that silently switches a
 * feature off — a listing with no position never appears in Nearby, and nobody
 * is told — matters more than a gap that merely leaves a page thinner, however
 * many rows each covers. So every check carries the sentence saying what
 * breaks, and the ordering follows that rather than the count.
 *
 * IT NEVER ASKS HIM TO INVENT ANYTHING. A blank coordinate on a kever is the
 * owner's standing decision and the right one — an approximate pin at the wrong
 * end of a town is worse than an address and a phone call (lib/place-coordinates.ts).
 * Those appear as `deliberate`: counted, explained, and never dressed up as
 * work outstanding. A dashboard that nags for a number somebody does not have
 * teaches him to fill it in with a guess, which is the failure this whole
 * codebase is built against.
 *
 * COUNTED FROM THE BUILT-IN CONTENT, so it works before the database is
 * connected and keeps working if it goes away — the same rule
 * lib/admin-overview.ts follows, and for the same reason: numbers that vanish
 * when a cache is down read as the content having vanished.
 */

import { attractions } from "@/data/attractions";
import { cemeteries } from "@/data/cemeteries";
import { destinations } from "@/data/destinations";
import { kosherEateries } from "@/data/kosher-eateries";
import { notableMikvaos } from "@/data/notable-mikvaos";
import { notableShuls } from "@/data/notable-shuls";
import { parsePoint } from "@/data/near-me";

/**
 * How much a gap costs.
 *
 * - `breaks` — a feature quietly does nothing for these records, and no
 *   message anywhere says so.
 * - `thin` — the page still works; there is simply less on it.
 * - `deliberate` — the blank is the right answer and stays blank. Counted so
 *   he knows the size of it, never listed as work.
 */
export type HealthSeverity = "breaks" | "thin" | "deliberate";

export type HealthCheck = {
  id: string;
  severity: HealthSeverity;
  /** What is missing. */
  label: string;
  /** What it costs, in one sentence. The reason this is on the list. */
  costs: string;
  affected: number;
  total: number;
  /** Where the work is done, when there is work to do. */
  href: string;
};

const missingPoint = (value: string | null | undefined) => !parsePoint(value ?? undefined);

const lower = (value: string) => value.trim().toLocaleLowerCase("en");

/** Every check, unordered — `dataHealth()` is what puts them in order. */
export function healthChecks(): HealthCheck[] {
  const foodCities = new Set(kosherEateries.map((eatery) => lower(eatery.city)));
  const shulCities = new Set(notableShuls.map((shul) => lower(shul.city)));

  return [
    {
      id: "attractions-no-position",
      severity: "breaks",
      label: "Things to do with no position",
      costs: "They cannot be measured from anywhere, so Nearby never returns them and the map has no pin.",
      affected: attractions.filter((attraction) => missingPoint(attraction.coordinates)).length,
      total: attractions.length,
      href: "/admin/directory/attractions",
    },
    {
      id: "food-no-position",
      severity: "breaks",
      label: "Kosher food with no position",
      costs:
        "Nearby cannot sort these by distance, which is why it answers with the Jewish quarter instead of the nearest restaurant.",
      affected: kosherEateries.filter((eatery) => missingPoint((eatery as { coordinates?: string }).coordinates)).length,
      total: kosherEateries.length,
      href: "/admin/directory/food",
    },
    {
      id: "mikvaos-no-position",
      severity: "breaks",
      label: "Mikvaos with no position",
      costs: "Nearby says nothing at all about mikvaos rather than return a list that would read as “there are none near you”.",
      affected: notableMikvaos.filter((mikvah) => missingPoint((mikvah as { coordinates?: string }).coordinates)).length,
      total: notableMikvaos.length,
      href: "/admin/mikvaos",
    },
    {
      id: "destinations-no-food",
      severity: "thin",
      label: "Destinations with no kosher food listed in the town",
      costs: "The first question a traveler asks about a place, and the page has nothing to answer it with.",
      affected: destinations.filter((destination) => !foodCities.has(lower(destination.city))).length,
      total: destinations.length,
      href: "/admin/directory/food",
    },
    {
      id: "destinations-no-shul",
      severity: "thin",
      label: "Destinations with no shul listed in the town",
      costs: "Somebody deciding where to spend Shabbos is told nothing about davening there.",
      affected: destinations.filter((destination) => !shulCities.has(lower(destination.city))).length,
      total: destinations.length,
      href: "/admin/shuls",
    },
    {
      id: "attractions-no-address",
      severity: "thin",
      label: "Things to do with no address",
      costs: "A traveler can read about it and cannot get to it without looking it up somewhere else.",
      affected: attractions.filter((attraction) => !attraction.address?.trim()).length,
      total: attractions.length,
      href: "/admin/directory/attractions",
    },
    {
      id: "food-no-address",
      severity: "thin",
      label: "Kosher food with no address",
      costs: "The listing names a place and cannot say where it is.",
      affected: kosherEateries.filter((eatery) => !eatery.address?.trim()).length,
      total: kosherEateries.length,
      href: "/admin/directory/food",
    },
    {
      id: "cemeteries-no-position",
      severity: "deliberate",
      label: "Batei hachaim where the grave's position is not known",
      costs:
        "Left blank on purpose: an approximate pin at the wrong end of a town sends somebody to a field, and the address and the shomer's number are the better answer. Fill one in only when you know the actual grave.",
      affected: cemeteries.filter((cemetery) => missingPoint(cemetery.coordinates)).length,
      total: cemeteries.length,
      href: "/admin/kevarim",
    },
  ];
}

const ORDER: Record<HealthSeverity, number> = { breaks: 0, thin: 1, deliberate: 2 };

/**
 * Every check worth showing, worst first.
 *
 * A check with nothing missing is dropped rather than shown at zero: a list of
 * green rows is a list to scroll past, and the point of this screen is the
 * handful of rows that are not.
 */
export function dataHealth(): HealthCheck[] {
  return healthChecks()
    .filter((check) => check.affected > 0)
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.affected - a.affected);
}

/** The one line at the top: how much of the site is missing something that breaks a feature. */
export function healthSummary(checks: readonly HealthCheck[]): string {
  const breaking = checks.filter((check) => check.severity === "breaks");
  if (breaking.length === 0) return "Nothing on the site is missing anything that switches a feature off.";
  const rows = breaking.reduce((sum, check) => sum + check.affected, 0);
  return `${rows.toLocaleString("en-US")} listings are missing something a feature depends on.`;
}
