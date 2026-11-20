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

