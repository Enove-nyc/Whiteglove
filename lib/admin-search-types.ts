/**
 * Shapes for the admin chrome search — listings, review candidates, and screens.
 * Distinct from public site search (lib/site-search-types.ts).
 */

export const ADMIN_HIT_SECTIONS = ["Screens", "Listings", "Candidates"] as const;
export type AdminHitSection = (typeof ADMIN_HIT_SECTIONS)[number];

export type AdminHit = {
  id: string;
  section: AdminHitSection;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
  matchRank?: number;
};

export type AdminSearchResponse = {
  query: string;
  results: AdminHit[];
};
