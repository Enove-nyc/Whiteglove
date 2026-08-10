/**
 * What a business can buy on this site, and what it cannot buy at any price.
 *
 * WHY THIS IS CODE RATHER THAN A PARAGRAPH IN A PLAN. The commitments below
 * were made in prose before any advertiser existed, and prose does not fail a
 * build. The first time somebody wires the promotion record to a listing's
 * ranking, or adds a "featured hechsher" field because an advertiser asked
 * nicely, the only thing standing in the way is whether anybody remembers.
 * This module is the thing that remembers, and tests/advertising-boundary.test.ts
 * is what makes forgetting fail.
 *
 * THE LINE. An advertiser buys ATTENTION — a banner, a card, a position in a
 * list that is labelled as a paid position. An advertiser never buys BELIEF.
 * The four labels on a practical detail, whether a page says a hotel is kosher,
 * and the order of anything a reader would take as this site's own judgement
 * are not for sale, and there is no price at which they become for sale.
 *
 * The distinction is not squeamishness. The entire reason a traveller would
 * use this site rather than a comparison site is that somebody checked. Sell
 * that once and there is nothing left to sell.
 */

/** Something a business can pay for. */
export type Sellable =
  | "banner"
  | "inline-card"
  | "popup"
  | "full-page"
  | "directory-featured";

/**
 * Something no business can pay for.
 *
 * Each of these is a claim the site makes on its own authority, and a reader
 * has no way to tell a bought one from an earned one — which is exactly why
 * the bought version cannot be allowed to exist.
 */
export type NotForSale =
  | "verified-label"
  | "kashrus-claim"
  | "hechsher-listing"
  | "editorial-ranking"
  | "destination-writeup"
  | "shabbos-assessment"
  | "trust-status";

export const SELLABLE: readonly Sellable[] = [
  "banner",
  "inline-card",
  "popup",
  "full-page",
  "directory-featured",
] as const;

export const NOT_FOR_SALE: readonly NotForSale[] = [
  "verified-label",
  "kashrus-claim",
  "hechsher-listing",
  "editorial-ranking",
  "destination-writeup",
  "shabbos-assessment",
  "trust-status",
] as const;

/** Why each one is not for sale, in the words the answer would need. */
export const WHY_NOT_FOR_SALE: Record<NotForSale, string> = {
  "verified-label": "Verified means somebody checked it against the place. Bought, it means nothing.",
  "kashrus-claim": "Whether somewhere is kosher is the certifying body's statement, not ours to sell.",
  "hechsher-listing": "The agency list says who exists. A paid entry would make it a directory of customers.",
  "editorial-ranking": "A reader takes our order as our judgement. Paid order is only honest when it is labelled paid.",
  "destination-writeup": "What a destination page says about a place is what we found, not what somebody paid for.",
  "shabbos-assessment": "Whether Shabbos works on foot decides a family's week. It is not an advertising slot.",
  "trust-status": "The four labels are the site's argument for itself. They are not inventory.",
};

/**
 * The one honest way to sell a position in a list.
 *
 * A paid position is fine. A paid position a reader mistakes for an earned one
 * is not, and the difference is entirely in whether it is labelled. So this is
 * not a preference about design — it is the condition that makes
 * `directory-featured` sellable at all.
 */
export const PAID_POSITION_MUST_BE_LABELLED = true;

export function isSellable(value: string): value is Sellable {
  return (SELLABLE as readonly string[]).includes(value);
}

export function isNotForSale(value: string): value is NotForSale {
  return (NOT_FOR_SALE as readonly string[]).includes(value);
}

/**
 * Nothing an advertiser buys may be described by any of these.
 *
 * Used by the test that reads the promotion record's own field names: if a
 * field called `verified`, `hechsher` or `trustLevel` ever appears on an
 * advertisement, that is the boundary being crossed in the only place it can
 * be crossed quietly.
 */
export const FORBIDDEN_ON_AN_ADVERT = [
  "verified",
  "verification",
  "trust",
  "hechsher",
  "kashrus",
  "kosherclaim",
  "shabbos",
  "rank",
  "ranking",
  "editorial",
] as const;

/**
 * Targeting an advertisement may use these and nothing else.
 *
 * WHERE somebody is and WHAT DEVICE they are on. Never how they keep: the
 * kosher standard, the Shabbos requirement and the hechsherim a person told
 * the planning flow about are there to do the trip's work, and an advertising
 * profile built out of them is a record of somebody's religious practice held
 * for the purpose of selling to them. lib/affiliate/clicks.ts already refuses
 * to carry those into a click record; this is the same rule one layer up.
 */
export const TARGETABLE = ["placement", "path", "device", "schedule"] as const;
