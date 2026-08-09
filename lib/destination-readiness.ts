/**
 * Whether a destination is ready to be published, decided rather than promised.
 *
 * THE PROBLEM THIS SOLVES. The vacation list is eighteen destinations and
 * fifteen of them are European cities; "Beach and resort" has one. The obvious
 * answer — write twenty more records — is the wrong one, because what makes
 * these pages worth reading is that every practical claim on them is derived
 * from a record with a source behind it. A destination record with no
 * attractions, no stays, no eateries and no quarter joined to it renders as a
 * page of honest empty states: truthful, and useless. Twenty of those would
 * make the site look bigger and be worth less.
 *
 * So growth needs a bar, and a bar that is a sentence in a document is a bar
 * that gets crossed on a busy afternoon. This is the bar as code: five
 * questions, answered from what the site actually holds, with the answer
 * printed by `npm run audit:pipeline` and asserted by a test.
 *
 * THE FIVE, and why each is on the list rather than being nice to have:
 *
 *   kosher food     — the first question a kosher traveler asks. A destination
 *                     that cannot answer it is not a destination, it is a wish.
 *   Shabbos         — the second. A quarter, a seasonal programme, or a base
 *                     town to bring it in from; "arrange it yourself" counts
 *                     only when there is something on record to arrange with.
 *   somewhere to stay — where you sleep decides whether Shabbos is walkable,
 *                     which is why it is separate from the food question.
 *   something to do — a place with food and nothing to do is a place to eat.
 *   getting there   — written on the record itself, and specific: which
 *                     airport, and what you need once you land.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not score quality and it does not
 * rank. Every check is "is there something here at all", because a threshold
 * anybody can argue with is a threshold that gets argued down. Two listings is
 * not a rich destination page; zero is not a destination page.
 *
 * Pure, and takes its data as arguments, so the same function serves the audit
 * script, the tests, and anything the admin grows later.
 */

import type { VacationDestination } from "@/data/vacation-destinations";
import { factsFor, kosherAvailability, shabbosPracticality, type VacationSources } from "@/lib/vacation-ideas";

export type ReadinessCheck = {
  id: "kosher-food" | "shabbos" | "somewhere-to-stay" | "something-to-do" | "getting-there";
  label: string;
  met: boolean;
  /** What is there, or what is missing. Written to be pasted into a to-do list. */
  detail: string;
};

export type Readiness = {
  slug: string;
  name: string;
  checks: ReadinessCheck[];
  /** Every check met. The bar for appearing in the list at all. */
  publishable: boolean;
  /** How many of the five are met, for sorting a backlog by how close it is. */
  met: number;
};

/**
 * How long a transport note has to be before it is telling somebody something.
 *
 * Not a quality judgement — a length below which it cannot be. "Fly to Rome"
 * is not an answer to how you get around once you have; the shortest genuinely
 * useful note in data/vacation-destinations.ts today is well over this.
 */
const TRANSPORT_MINIMUM = 80;

export function readinessOf(destination: VacationDestination, sources: VacationSources): Readiness {
  const facts = factsFor(destination, sources);
  const kosher = kosherAvailability(destination, facts);
  const shabbos = shabbosPracticality(destination, facts);

  const eateries = facts.eateries.length + (facts.base?.eateries.length ?? 0);
  const stays = facts.stays.length;
  const areas = facts.areas.length + (facts.base?.areas.length ?? 0);

  const checks: ReadinessCheck[] = [
    {
      id: "kosher-food",
      label: "Kosher food",
      met: kosher.level !== "not-checked",
      detail:
        kosher.level === "not-checked"
          ? "Nothing on record in the destination or in a base town. Add eateries or a quarter to data/kosher-eateries.ts and data/kosher-stays.ts."
          : `${kosher.label} — ${eateries} listing${eateries === 1 ? "" : "s"}, ${areas} quarter${areas === 1 ? "" : "s"}.`,
    },
    {
      id: "shabbos",
      label: "Shabbos",
      met: shabbos.level !== "not-checked",
      detail:
        shabbos.level === "not-checked"
          ? "No quarter, no seasonal programme and no base town. There is nothing to say about Friday night here yet."
          : shabbos.label,
    },
    {
      id: "somewhere-to-stay",
      label: "Somewhere to stay",
      met: stays > 0 || facts.areas.length > 0,
      detail:
        stays > 0 || facts.areas.length > 0
          ? `${stays} stay${stays === 1 ? "" : "s"} and ${facts.areas.length} quarter${facts.areas.length === 1 ? "" : "s"} in the destination itself.`
          : "No stay and no quarter in the destination itself. A base town does not answer where to sleep.",
    },
    {
      id: "something-to-do",
      label: "Something to do",
      met: facts.attractions.length > 0,
      detail:
        facts.attractions.length > 0
          ? `${facts.attractions.length} on record.`
          : "Nothing in data/attractions.ts joins to these cities. A destination with food and nothing to do is a place to eat.",
    },
    {
      id: "getting-there",
      label: "Getting there and around",
      met: destination.transport.trim().length >= TRANSPORT_MINIMUM,
      detail:
        destination.transport.trim().length >= TRANSPORT_MINIMUM
          ? "Written on the record."
          : `The transport note is ${destination.transport.trim().length} characters. Say which airport, and what you need once you land.`,
    },
  ];

  const met = checks.filter((check) => check.met).length;
  return { slug: destination.slug, name: destination.name, checks, publishable: met === checks.length, met };
}

export function readinessOfAll(
  destinations: readonly VacationDestination[],
  sources: VacationSources,
): Readiness[] {
  return destinations.map((destination) => readinessOf(destination, sources));
}

/** The ones that are not ready, closest first — which is the order to work in. */
export function backlog(all: readonly Readiness[]): Readiness[] {
  return all.filter((entry) => !entry.publishable).sort((a, b) => b.met - a.met);
}

/** What is missing across the whole list, counted, so the biggest gap is visible. */
export function missingByCheck(all: readonly Readiness[]): Array<{ id: ReadinessCheck["id"]; label: string; missing: number }> {
  const counts = new Map<string, { id: ReadinessCheck["id"]; label: string; missing: number }>();
  for (const entry of all) {
    for (const check of entry.checks) {
      const seen = counts.get(check.id) ?? { id: check.id, label: check.label, missing: 0 };
      if (!check.met) seen.missing += 1;
      counts.set(check.id, seen);
    }
  }
  return [...counts.values()].sort((a, b) => b.missing - a.missing);
}
