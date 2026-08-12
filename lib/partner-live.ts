/**
 * What live partner inventory /book can show without taking payment.
 *
 * Hotels: Stay22 Direct Travel API. Flights and cars on /book are partner
 * search widgets (not a fare list), so these flags stay off for those desks.
 * Capabilities are safe to expose to the browser — only booleans, never keys.
 */

import { stay22ApiConfigured } from "@/lib/stay22-api";

export type PartnerLiveCapabilities = {
  hotels: boolean;
  flights: boolean;
  /** No public car inventory API — the Cars tab is a partner search widget. */
  cars: boolean;
};

export function partnerLiveCapabilities(): PartnerLiveCapabilities {
  return {
    hotels: stay22ApiConfigured(),
    flights: false,
    cars: false,
  };
}
