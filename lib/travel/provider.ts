/**
 * The port every travel company is reached through.
 *
 * ONE VERB, NOT TWENTY. The obvious design is a full interface per category —
 * search, details, create, cancel, times five categories. That is twenty
 * methods for a site where three categories have one provider each, one has
 * none, and nothing books publicly at all: nineteen of them would exist to be
 * maintained rather than called.
 *
 * So a provider is one thing: something that can be asked for offers and will
 * answer, or fail, within a deadline. Booking is deliberately absent. When a
 * category earns a real booking flow, it gets its own port then, designed
 * against the provider whose lifecycle it actually has to model — Duffel's
 * order flow and RouteStack's hand-off to somebody else's checkout are not the
 * same shape, and pretending otherwise now would cost more than it saves.
 */

import type { Fulfilment, ProviderId, SearchQuery, TravelCategory, TravelOffer } from "@/lib/travel/types";

export type { SearchQuery } from "@/lib/travel/types";

/**
 * A provider's answer.
 *
 * `configured: false` is not an error. A company we have not signed up with
 * yet is a normal state of the world, and it must not appear in the failure
 * count or turn a search amber in the admin.
 */
export type ProviderSearch = {
  id: ProviderId;
  category: TravelCategory;
  /**
   * WHO SELLS THE TICKET, DECLARED ONCE AND NOT PER OFFER.
   *
   * Every offer already carries a fulfilment, which is what the page renders.
   * This is the same fact stated about the company, which is what the site
   * makes a rule out of: an `api-booking` provider is one where White Glove is
   * the seller and therefore owns the refund, the chargeback and the phone
   * call. The owner's decision is that no such provider faces a visitor, and a
   * decision like that belongs in the type rather than in a setting somebody
   * could flip on a Friday. See searchTravel in engine.ts, which enforces it.
   */
  fulfilment: Fulfilment;
  /** Whether the keys and settings this provider needs are present. */
  configured(): boolean;
  /**
   * Ask for offers.
   *
   * MUST honour the signal — the whole search shares one deadline and a
   * provider that ignores it holds up every other provider's results. MAY
   * throw; the runner catches, groups the error and carries on with whatever
   * the others returned.
   */
  search(query: SearchQuery, signal: AbortSignal): Promise<TravelOffer[]>;
};
