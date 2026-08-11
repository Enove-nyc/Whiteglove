import { cemeteries } from "@/data/cemeteries";
import { destinations, guidedDestinations } from "@/data/destinations";
import { destinationDatabase } from "@/data/destination-database";
import { NOTHING_ENTERED, type DestinationFacts } from "@/lib/completeness-source";
import { completeness } from "@/lib/verification";

/**
 * What the site actually holds, counted.
 *
 * The dashboard knew how many people had visited and nothing about what they
 * had visited — no count of destinations, cemeteries, tzaddikim or anything
 * else. "Website health" was a lock switch.
 *
 * Counted from the built-in content, so this works before the database is
 * connected and keeps working if it goes away — the same rule the completeness
 * queue follows. Numbers that vanish when a cache is down are worse than no
 * numbers, because they read as the content having vanished.
 */

export type ContentTotals = {
  destinations: number;
  guides: number;
  cemeteries: number;
  tzaddikim: number;
  countries: number;
  /** Records with nothing practical published yet. The work. */
  empty: number;
  /** Records with something checked. */
  started: number;
  /** Mean completeness across every record, 0–100. Admin only. */
  averageCompleteness: number;
};

/**
 * Where each dashboard total tile should take the owner.
 *
 * Every tile that can open a real screen does. Countries has no editor yet —
 * the stub at `/admin/countries` says so honestly rather than looking clickable
 * and going nowhere, or inventing a fake countries list.
 */
export type AdminTotalCard = {
  key: keyof Pick<ContentTotals, "destinations" | "guides" | "cemeteries" | "tzaddikim" | "countries" | "empty">;
  label: string;
  href: string;
};

export const ADMIN_TOTAL_CARDS: readonly AdminTotalCard[] = [
  { key: "destinations", label: "Destinations", href: "/admin/destinations" },
  { key: "guides", label: "Full guides", href: "/admin/destinations" },
  { key: "cemeteries", label: "Batei hachaim", href: "/admin/kevarim" },
  { key: "tzaddikim", label: "Kevarim listed", href: "/admin/kevarim" },
  { key: "countries", label: "Countries", href: "/admin/countries" },
  { key: "empty", label: "Nothing yet", href: "/admin/destinations" },
] as const;

/**
 * @param facts What the database holds, from readDestinationFacts(). Given it,
 *   the averages count what the owner has actually entered rather than only
 *   the built-in content. Without it the numbers are the same as they were.
 */
export function contentTotals(facts?: Map<string, DestinationFacts> | null): ContentTotals {
  const scored = destinationDatabase.map((record) =>
    completeness(record, facts ? facts.get(record.id) ?? NOTHING_ENTERED : undefined),
  );
  const total = scored.length || 1;

  return {
    destinations: destinations.length,
    guides: guidedDestinations().length,
    cemeteries: cemeteries.length,
    // Every person listed as buried somewhere. Counted across cemeteries
    // rather than deduplicated: a tzaddik listed in two places is two records
    // to keep right, which is what the number is for.
    tzaddikim: cemeteries.reduce((sum, cemetery) => sum + cemetery.burials.length, 0),
    // Across everything the site holds, not just the destinations list.
    // Counting only destinations said eight, while the batei hachaim alone
    // reach far more — a headline number that undercounts the content is
    // worse than no headline number.
    countries: new Set([...destinations.map((d) => d.country), ...cemeteries.map((c) => c.country)].filter(Boolean)).size,
    empty: scored.filter((s) => s.score === 0).length,
    started: scored.filter((s) => s.score > 0).length,
    averageCompleteness: Math.round(scored.reduce((sum, s) => sum + s.score, 0) / total),
  };
}
