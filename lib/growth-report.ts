/**
 * Admin growth / conversion report — privacy-safe aggregates only.
 *
 * Builds on site-analytics counters and affiliate click ledgers. Never includes
 * email addresses, account ids or full IP addresses.
 */

import { readCounts, readClicks } from "@/lib/affiliate/clicks";
import {
  analyticsIsConfigured,
  getAlertDestinationCounts,
  getAlertSignupTotal,
  getAlertTopicCounts,
  getEmptySearches,
  getSearchKinds,
  getTopSearchFilters,
  getTopSearches,
  getTopVisitedPaths,
} from "@/lib/site-analytics";

export type GrowthReport = {
  configured: boolean;
  says: string;
  topSearches: Array<{ label: string; count: number }>;
  emptySearches: Array<{ label: string; count: number }>;
  searchKinds: Array<{ label: string; count: number }>;
  searchFilters: Array<{ label: string; count: number }>;
  topDestinations: Array<{ label: string; visits: number; clicks: number; alerts: number }>;
  affiliateByProduct: Array<{ label: string; count: number }>;
  affiliateByPlacement: Array<{ label: string; count: number }>;
  alertTotal: number;
  alertTopics: Array<{ label: string; count: number }>;
  /** Searches that had results opened, vs searches overall — coarse CTR proxy. */
  searchToSelection: { searches: number; selections: number };
  highTrafficLowEngagement: Array<{ path: string; visits: number; clicks: number }>;
  recentClicks: Array<{
    at: string;
    product: string;
    destinationSlug: string;
    page: string;
    placement: string;
    earns: boolean;
  }>;
};

function pathToDestinationSlug(path: string): string | null {
  const m = path.match(/^\/destinations\/([^/?#]+)/);
  return m?.[1] ?? null;
}

export async function buildGrowthReport(): Promise<GrowthReport> {
  const configured = analyticsIsConfigured();
  if (!configured) {
    return {
      configured: false,
      says: "Visits, searches and booking clicks are not being recorded until the private store is connected.",
      topSearches: [],
      emptySearches: [],
      searchKinds: [],
      searchFilters: [],
      topDestinations: [],
      affiliateByProduct: [],
      affiliateByPlacement: [],
      alertTotal: 0,
      alertTopics: [],
      searchToSelection: { searches: 0, selections: 0 },
      highTrafficLowEngagement: [],
      recentClicks: [],
    };
  }

  const [
    topSearches,
    emptySearches,
    searchKinds,
    searchFilters,
    visited,
    alertTotal,
    alertTopics,
    alertDestinations,
    clickCounts,
    clicks,
  ] = await Promise.all([
    getTopSearches(30),
    getEmptySearches(30),
    getSearchKinds(20),
    getTopSearchFilters(20),
    getTopVisitedPaths(80),
    getAlertSignupTotal(),
    getAlertTopicCounts(20),
    getAlertDestinationCounts(40),
    readCounts(),
    readClicks(80),
  ]);

  const clicksByDestination = new Map<string, number>();
  for (const [key, count] of Object.entries(clickCounts)) {
    if (key.startsWith("destination:")) {
      clicksByDestination.set(key.slice("destination:".length), count);
    }
  }
  const alertsByDestination = new Map(alertDestinations.map((row) => [row.label, row.count]));

  const topDestinations = visited
    .map((row) => {
      const slug = pathToDestinationSlug(row.path);
      if (!slug) return null;
      return {
        label: slug,
        visits: row.count,
        clicks: clicksByDestination.get(slug) ?? 0,
        alerts: alertsByDestination.get(slug) ?? 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, 20);

  const affiliateByProduct = Object.entries(clickCounts)
    .filter(([key]) => key.startsWith("product:"))
    .map(([key, count]) => ({ label: key.slice("product:".length), count }))
    .sort((a, b) => b.count - a.count);

  const affiliateByPlacement = Object.entries(clickCounts)
    .filter(([key]) => key.startsWith("placement:"))
    .map(([key, count]) => ({ label: key.slice("placement:".length), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const searchTotal = topSearches.reduce((sum, row) => sum + row.count, 0);
  const selectionTotal = searchKinds.reduce((sum, row) => sum + row.count, 0);

  const highTrafficLowEngagement = visited
    .filter((row) => row.path.startsWith("/destinations/"))
    .map((row) => {
      const slug = pathToDestinationSlug(row.path);
      return {
        path: row.path,
        visits: row.count,
        clicks: slug ? clicksByDestination.get(slug) ?? 0 : 0,
      };
    })
    .filter((row) => row.visits >= 5 && row.clicks === 0)
    .slice(0, 15);

  return {
    configured: true,
    says: "Counted since the private store was connected. Page paths, search words and booking categories only — nobody is identified.",
    topSearches,
    emptySearches,
    searchKinds,
    searchFilters,
    topDestinations,
    affiliateByProduct,
    affiliateByPlacement,
    alertTotal,
    alertTopics,
    searchToSelection: { searches: searchTotal, selections: selectionTotal },
    highTrafficLowEngagement,
    recentClicks: clicks.slice(0, 25).map((c) => ({
      at: c.at,
      product: c.product,
      destinationSlug: c.destinationSlug,
      page: c.page,
      placement: c.placement,
      earns: c.earns,
    })),
  };
}
