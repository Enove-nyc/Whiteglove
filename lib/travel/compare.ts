/**
 * When two offers may be shown as alternatives to each other, and when they
 * may not.
 *
 * THIS IS A REFUSAL, NOT A RANKING. The tempting thing to build is a function
 * that sorts offers by price and labels the first one cheapest. It is also the
 * thing most likely to make White Glove tell somebody an untruth: a £180 fare
 * with no bag, no change and a middle seat at the back is not "cheaper" than a
 * £240 fare with a bag and a refund — it is a different product, and calling
 * one of them cheaper is a claim about a comparison nobody made.
 *
 * So the only question answered here is whether two offers are the same KIND
 * of thing. If they are, a page may put a price next to a price. If they are
 * not — or if we simply were not told — they are shown as separate options and
 * the word "cheaper" is never used about them.
 *
 * UNKNOWN IS NOT A MATCH. Every field defaults to incomparable when missing,
 * because a provider that did not tell us whether a fare is refundable has not
 * told us it is.
 */

import type { TravelOffer } from "@/lib/travel/types";

export type ComparisonVerdict = {
  comparable: boolean;
  /** Which fields stopped it. Admin-facing; never shown to a traveler. */
  differences: string[];
};

/** Same value, both known. Two unknowns are not a match. */
function same(a: unknown, b: unknown): boolean {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  if (a === "unknown" || b === "unknown") return false;
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return a === b;
}

export function comparable(a: TravelOffer, b: TravelOffer): ComparisonVerdict {
  const differences: string[] = [];
  const push = (field: string) => differences.push(field);

  if (a.category !== b.category) return { comparable: false, differences: ["category"] };

  // A price in one currency against a price in another is not a comparison,
  // it is an exchange-rate opinion.
  if (!a.price || !b.price) push("price");
  else if (a.price.currency !== b.price.currency) push("currency");

  // Booking it ourselves versus handing the traveler to somebody else's
  // checkout is a different purchase with different rights attached.
  if (a.fulfilment !== b.fulfilment) push("how it is booked");

  if (!same(a.meta.refundable, b.meta.refundable)) push("refundability");
  if (!same(a.meta.cancellation, b.meta.cancellation)) push("cancellation terms");

  if (a.category === "flight") {
    if (!same(a.meta.cabin, b.meta.cabin)) push("cabin");
    if (!same(a.meta.bags, b.meta.bags)) push("baggage");
    if (!same(a.meta.stops, b.meta.stops)) push("stops");
  }
  if (a.category === "hotel") {
    if (!same(a.meta.roomType, b.meta.roomType)) push("room type");
    if (!same(a.meta.mealPlan, b.meta.mealPlan)) push("meal plan");
  }
  if (a.category === "car") {
    if (!same(a.meta.carClass, b.meta.carClass)) push("car class");
    if (!same(a.meta.mileage, b.meta.mileage)) push("mileage");
    if (!same(a.meta.deposit, b.meta.deposit)) push("deposit");
  }

  return { comparable: differences.length === 0, differences };
}

/**
 * The lowest price among offers that are genuinely alternatives to each other.
 *
 * Returns null unless every offer considered is comparable with every other —
 * which, given how much providers leave out, will often be null. That is the
 * honest answer and the reason this returns one rather than guessing.
 */
export function lowestComparable(offers: TravelOffer[]): TravelOffer | null {
  const priced = offers.filter((offer) => offer.price);
  if (priced.length < 2) return priced[0] ?? null;
  for (let i = 1; i < priced.length; i += 1) {
    if (!comparable(priced[0], priced[i]).comparable) return null;
  }
  return priced.reduce((cheapest, offer) =>
    (offer.price?.amount ?? Infinity) < (cheapest.price?.amount ?? Infinity) ? offer : cheapest,
  );
}

/**
 * The same offers, cheapest first, without touching the caller's array.
 *
 * WHY THIS IS A FUNCTION AND NOT A `.sort()` AT THE CALL SITE. The admin
 * comparison prints a provider's lowest price as a heading and then five of
 * its offers below. Unsorted, those five were whichever the provider happened
 * to send first: a Pune hotel search read "lowest USD 251.49" above rows
 * priced 591, 994, 1086, 1131 and 292, so the cheaper of the two companies
 * looked like the dearer one. Two columns in different orders are not a
 * comparison.
 *
 * An offer with no price sorts last rather than first, because a missing
 * number is not a low one.
 */
export function cheapestFirst<T extends { price?: { amount: number } }>(offers: T[]): T[] {
  return offers
    .slice()
    .sort((a, b) => (a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity));
}
