/**
 * Where a paid placement can actually appear, and what the visitor is told.
 *
 * THE BRIEF ASKED FOR ONE PREMIUM POSITION PER PAGE, labelled. Four of the
 * original placements were typed and rendered nowhere; the visitor-facing
 * banners still say Sponsored. The new spots below are the commercial
 * inventory — each one has a renderer, and each one has a label that does not
 * pretend the position was earned.
 *
 * A listing can buy a label. It cannot buy a status. That wall is
 * tests/advertising-boundary.test.ts and lib/advertising-boundary.ts.
 */

import type { PromotionPlacement } from "@/lib/admin-content";

export type PaidLabel = "Sponsored" | "Featured partner" | "Sponsored content";

export type PlacementSpec = {
  value: PromotionPlacement;
  /** Owner-facing, in the wizard. */
  label: string;
  detail: string;
  /** Visitor-facing. Never empty: an unlabelled paid position is the thing the law catches. */
  paidLabel: PaidLabel;
};

/**
 * The commercial spots that render, in addition to the site-wide banners.
 *
 * `article-sponsored` is not here: there is no sponsored-article page yet, and
 * offering a spot that displays nothing is the bug tests/ad-types.test.ts
 * exists to catch.
 */
export const PREMIUM_PLACEMENTS: readonly PlacementSpec[] = [
  {
    value: "home-seasonal",
    label: "On the home page, with the seasonal stays",
    detail: "One card in the seasonal section. Empty when nothing is booked.",
    paidLabel: "Featured partner",
  },
  {
    value: "destination-sponsor",
    label: "On a destination page",
    detail: "One position per destination. Restrict the addresses under Advanced.",
    paidLabel: "Sponsored",
  },
  {
    value: "hotels-featured",
    label: "On Where to stay",
    detail: "Above the partner search, labelled as a paid position.",
    paidLabel: "Featured partner",
  },
  {
    value: "things-to-do-featured",
    label: "On Things to do",
    detail: "One position on the attractions page.",
    paidLabel: "Featured partner",
  },
  {
    value: "before-you-go",
    label: "On insurance and eSIM pages",
    detail: "Beside the before-you-go tools, not instead of them.",
    paidLabel: "Sponsored",
  },
  {
    value: "directory-enhanced",
    label: "On the partner directory",
    detail: "A labelled position on the directory. Not sold until the owner says so.",
    paidLabel: "Featured partner",
  },
];

const PREMIUM_BY_VALUE = new Map(PREMIUM_PLACEMENTS.map((spec) => [spec.value, spec]));

const BANNER_LABELS: Partial<Record<PromotionPlacement, PaidLabel>> = {
  "fixed-top-banner": "Sponsored",
  "sticky-bottom-banner": "Sponsored",
  popup: "Sponsored",
  "homepage-promo": "Sponsored",
  "inline-content": "Sponsored",
  "itinerary-footer": "Sponsored",
  "full-page-takeover": "Sponsored",
};

/** What a visitor is told. Never an empty string. */
export function placementLabel(placement: string): PaidLabel {
  const premium = PREMIUM_BY_VALUE.get(placement as PromotionPlacement);
  if (premium) return premium.paidLabel;
  return BANNER_LABELS[placement as PromotionPlacement] ?? "Sponsored";
}

export function isPremiumPlacement(placement: string): boolean {
  return PREMIUM_BY_VALUE.has(placement as PromotionPlacement);
}
