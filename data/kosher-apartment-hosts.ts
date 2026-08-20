/**
 * Where to find a kosher short-term apartment — the sites, agencies and hosts.
 *
 * The parallel to data/notable-eruvin.ts and the shuls: a curated flat file the
 * public "Where to stay" page reads. What it lists is not apartments but the
 * PLACES A TRAVELLER GOES TO FIND ONE — a kosher-Airbnb marketplace, a frum
 * rental agency, a private host who lets a kosher-equipped flat. Each entry is a
 * pointer out to that provider; the site does not take the booking.
 *
 * IT SHIPS EMPTY ON PURPOSE. This site does not invent a business, a link or a
 * phone number — every listing on it is real and sourced, and a made-up "Kosher
 * Apartments of Rome" with a guessed address would be the one thing on the page
 * that is not true. The owner adds the real ones from the admin
 * (/admin/kosher-apartments); until he has, the public section shows nothing
 * rather than a placeholder. When a genuinely well-known provider belongs in the
 * shipped list, it goes here, in this shape.
 */

export type ApartmentHostSeed = {
  slug: string;
  name: string;
  /** Where they offer apartments — a city, a country, a region, or "Worldwide". */
  area: string;
  /** One sentence on what they are. */
  note?: string;
  /** The provider's website, when it is a site. */
  url?: string;
  /** A phone number, for a host or agent you call. */
  phone?: string;
  /** A WhatsApp number, for a host you message. */
  whatsapp?: string;
};

export const kosherApartmentHosts: readonly ApartmentHostSeed[] = [];
