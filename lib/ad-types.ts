// Advertisements, described the way the owner thinks about them.
//
// The stored model keeps a list of "placements" — internal identifiers like
// `sticky-bottom-banner`. Those are the right thing to store and the wrong
// thing to ask about. Nobody decides to make a `sticky-bottom-banner`; they
// decide to put a bar along the bottom of every page.
//
// So the screen asks two plain questions — what kind of advertisement, and
// where should it show — and this file turns the answers into placements.
//
// Only spots that actually render are offered. Five of the eleven declared
// placements (`sidebar`, `destination-specific`, `accommodation-page`,
// `sponsored-listing`, and `full-page-takeover` used on its own) are read by
// nothing on the public site. They stay in the stored type so an old record
// still loads, but they are not offered, because offering a choice that does
// nothing is worse than not having it.

import type { PromotionPlacement } from "@/lib/admin-content";

export type AdKind = "banner" | "popup" | "inline" | "fullpage";

export type AdSpot = {
  value: PromotionPlacement;
  label: string;
  detail: string;
};

export const AD_KINDS: Array<{ value: AdKind; label: string; detail: string }> = [
  {
    value: "banner",
    label: "Banner",
    detail: "A slim strip across the top or bottom of the page. Always visible, never in the way.",
  },
  {
    value: "popup",
    label: "Popup",
    detail: "A box over the page, once per visit. The most noticed, and the most easily resented.",
  },
  {
    value: "inline",
    label: "Inside the page",
    detail: "A card that sits in the flow of the page, like part of the content.",
  },
  {
    value: "fullpage",
    label: "Full screen",
    detail: "Takes over the whole screen until it is closed. Save this for something that matters.",
  },
];

/** Where each kind of advertisement can actually appear. */
export const SPOTS_BY_KIND: Record<AdKind, AdSpot[]> = {
  banner: [
    { value: "fixed-top-banner", label: "Across the top of every page", detail: "Under the site header." },
    { value: "sticky-bottom-banner", label: "Along the bottom of every page", detail: "Stays as the visitor scrolls." },
  ],
  popup: [{ value: "popup", label: "Over the page, once per visit", detail: "On whichever pages you choose." }],
  inline: [
    { value: "homepage-promo", label: "On the home page", detail: "Below the search, where people are already looking." },
    { value: "inline-content", label: "Partway down the home page", detail: "Between two sections." },
    {
      value: "itinerary-footer",
      label: "At the bottom of an itinerary",
      detail: "Including itineraries a traveler has shared with somebody else.",
    },
  ],
  fullpage: [
    { value: "homepage-promo", label: "When someone opens the home page", detail: "" },
    { value: "inline-content", label: "Partway down the home page", detail: "" },
    { value: "itinerary-footer", label: "On an itinerary", detail: "" },
  ],
};

/** Every spot that renders, for reading an existing advertisement back. */
export const LIVE_PLACEMENTS: PromotionPlacement[] = [
  "fixed-top-banner",
  "sticky-bottom-banner",
  "popup",
  "homepage-promo",
  "inline-content",
  "itinerary-footer",
];

/**
 * The kind and spot an existing advertisement represents.
 *
 * `full-page-takeover` is a style, not a place — on its own it renders nothing,
 * so a record carrying it is read as a full-screen advertisement shown at
 * whichever real spot sits alongside it.
 */
export function readAd(placements: PromotionPlacement[]): { kind: AdKind; spot: PromotionPlacement } {
  const fullPage = placements.includes("full-page-takeover");
  const spot = placements.find((p) => LIVE_PLACEMENTS.includes(p));

  if (fullPage) return { kind: "fullpage", spot: spot ?? "homepage-promo" };
  if (spot === "popup") return { kind: "popup", spot: "popup" };
  if (spot === "fixed-top-banner" || spot === "sticky-bottom-banner") return { kind: "banner", spot };
  return { kind: "inline", spot: spot ?? "homepage-promo" };
}

/** The placements to store for a chosen kind and spot. */
export function writeAd(kind: AdKind, spot: PromotionPlacement): PromotionPlacement[] {
  if (kind === "fullpage") return ["full-page-takeover", spot];
  return [spot];
}

/** "A banner across the top of every page" — one line, for a card. */
export function describeAd(placements: PromotionPlacement[]): string {
  const { kind, spot } = readAd(placements);
  const spotLabel = SPOTS_BY_KIND[kind].find((s) => s.value === spot)?.label ?? "somewhere on the site";
  const kindLabel = AD_KINDS.find((k) => k.value === kind)?.label ?? "Advertisement";
  return `${kindLabel} · ${spotLabel.charAt(0).toLowerCase()}${spotLabel.slice(1)}`;
}

/** Draft, scheduled, live or paused — what the owner needs to know at a glance. */
export function adStatus(p: {
  enabled: boolean;
  startDate: string;
  endDate: string;
  placements: PromotionPlacement[];
}): { label: "Draft" | "Scheduled" | "Live" | "Paused" | "Finished"; tone: "muted" | "info" | "good" | "warn" } {
  if (!p.enabled) {
    // Never turned on and never given dates reads as a draft; turned off after
    // having been on reads as paused.
    return p.startDate || p.endDate ? { label: "Paused", tone: "warn" } : { label: "Draft", tone: "muted" };
  }
  const today = new Date().toISOString().slice(0, 10);
  if (p.startDate && p.startDate > today) return { label: "Scheduled", tone: "info" };
  if (p.endDate && p.endDate < today) return { label: "Finished", tone: "muted" };
  return { label: "Live", tone: "good" };
}
