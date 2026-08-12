/**
 * What live partner inventory /book can show without taking payment.
 *
 * Capabilities are safe to expose to the browser — only booleans, never keys.
 */

import { stay22ApiConfigured } from "@/lib/stay22-api";
import { travelpayoutsTokenConfigured } from "@/lib/travelpayouts-api";

export type PartnerLiveCapabilities = {
  hotels: boolean;
  flights: boolean;
  /** No public Travelpayouts car inventory API wired — hand-off only. */
  cars: boolean;
};

export function partnerLiveCapabilities(): PartnerLiveCapabilities {
  return {
    hotels: stay22ApiConfigured(),
    flights: travelpayoutsTokenConfigured(),
    cars: false,
  };
}
