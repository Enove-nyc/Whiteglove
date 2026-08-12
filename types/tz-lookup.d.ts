/**
 * tz-lookup ships no types of its own.
 *
 * It is one function: coordinates in, an IANA timezone name out, from a
 * compiled-in copy of the timezone boundaries. No network, no key, CC0.
 */
declare module "tz-lookup" {
  /** e.g. tz(40.6323, -73.9928) → "America/New_York". Throws on bad input. */
  export default function tz(latitude: number, longitude: number): string;
}
