import type { IconName } from "@/components/icons/Icon";

/**
 * The searches under "Find travel", kept in a plain module (not the client
 * search component) so the server-rendered home page can read the list — a
 * value exported from a "use client" file reaches a server component as a
 * client reference, not as the array.
 */
export type TravelTab = "flights" | "hotels" | "cars" | "activities" | "transfers" | "esim" | "insurance";

/**
 * Everything under "Find travel", in its order (owner, 20 November 2026: the
 * box on a computer carries all of it). `href` is each one's own page — on a
 * phone the home page lists these instead of showing tabs, and each opens its
 * own page with just that search.
 */
export const TRAVEL_TABS: Array<{ id: TravelTab; label: string; short: string; icon: IconName; href: string }> = [
  { id: "flights", label: "Flights", short: "Flights", icon: "plane", href: "/find/flights" },
  { id: "hotels", label: "Hotels", short: "Hotels", icon: "bed", href: "/find/hotels" },
  { id: "cars", label: "Car rentals", short: "Cars", icon: "car", href: "/find/car-rentals" },
  { id: "activities", label: "Things to do", short: "Activities", icon: "ticket", href: "/find/things-to-do" },
  { id: "transfers", label: "Transfers", short: "Transfers", icon: "car", href: "/transfers" },
  { id: "esim", label: "eSIMs", short: "eSIMs", icon: "phone", href: "/esim" },
  { id: "insurance", label: "Travel insurance", short: "Insurance", icon: "check", href: "/travel-insurance" },
];


/** The query words a search link may carry (the same ones /book took). */
export const SEARCH_LINK_KEYS = ["from", "to", "depart", "return", "destination"] as const;

/**
 * A link that opens one search, prefilled, and works on a phone too.
 *
 * Links used to point at the home page's box ("/?type=cars#search"), and on a
 * phone the home page shows a list instead of the box — so "Search car hire"
 * landed on a list and nothing happened (owner, 22 November 2026). Every such
 * link goes to that search's own page instead.
 */
export function searchHref(tab: TravelTab, fill: Partial<Record<(typeof SEARCH_LINK_KEYS)[number], string>> = {}): string {
  const page = TRAVEL_TABS.find((t) => t.id === tab)?.href ?? "/";
  const query = new URLSearchParams();
  for (const key of SEARCH_LINK_KEYS) if (fill[key]) query.set(key, fill[key]!.slice(0, 80));
  const q = query.toString();
  return q ? `${page}?${q}` : page;
}

/** "flights" / "hotels" / "cars" / "activities" from a link's ?type=. */
export function tabFromType(type: string | undefined): TravelTab | undefined {
  return type === "flights" || type === "hotels" || type === "cars" || type === "activities" ? type : undefined;
}
