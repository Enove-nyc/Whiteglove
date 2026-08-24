/**
 * An Advisor Pro account's own name and logo on the itineraries it produces.
 *
 * WHAT THIS IS FOR. Somebody who plans trips for other people — an agent, a
 * hotel concierge, an office that sends groups — builds the trip in the same
 * planner everybody else uses and hands the printed itinerary to their client.
 * That document should say who prepared it. Handing a client a document with
 * somebody else's crest on the cover is the one thing that makes the tool
 * unusable for the person it is meant for.
 *
 * THE CREDIT LINE STAYS, AND THAT IS A DECISION, NOT AN OVERSIGHT. The cover,
 * the page headers and the "prepared by" line become theirs. The footer keeps
 * one quiet line saying the itinerary was planned with whiteglovekoshertravel.com.
 * This is how white-label planners normally work, it is what the owner chose,
 * and it is the only thing on the document that is not the business's own. The
 * enforcement lives in components/PrintableItinerary.tsx, not here — this
 * module only describes what a brand IS.
 *
 * A LOGO IS OPTIONAL AND A NAME IS NOT. A brand with a picture and no name
 * gives the client nothing to search for or ring up; a brand with a name and no
 * picture is a perfectly good letterhead. So the name is required and the logo
 * is not.
 */

export const MAX_BRAND_NAME = 60;
export const MAX_BRAND_LINE = 120;

export type BusinessBrand = {
  /** The account it belongs to — what they sign in with. */
  account: string;
  /** The name on the cover. "Kesser Travel", not a legal entity. */
  name: string;
  /**
   * The media id of an uploaded logo, served from /api/media. Empty means the
   * document uses the name in type, which is a real letterhead and not a
   * failure state.
   */
  logoMediaId: string;
  /**
   * One line under the name on the cover — a phone number, an email, "Trips
   * arranged from Brooklyn". Whatever their client would want to see. Optional.
   */
  contactLine: string;
  /** Whether to use it at all. Off means their itineraries look like everyone's. */
  enabled: boolean;
  updatedAt: string;
};

export function emptyBrand(account = ""): BusinessBrand {
  return { account, name: "", logoMediaId: "", contactLine: "", enabled: false, updatedAt: "" };
}

/** Why this brand cannot be saved, or null. */
export function brandProblem(input: { name?: string; contactLine?: string; enabled?: boolean }): string | null {
  const name = input.name?.trim() ?? "";
  // Nothing to check on a brand that is switched off — turning it off should
  // never be blocked by a field somebody has half-filled.
  if (!input.enabled) return null;
  if (!name) return "Give the business a name — that is what goes on the cover.";
  if (name.length > MAX_BRAND_NAME) return `Keep the name under ${MAX_BRAND_NAME} characters so it fits on the cover.`;
  if ((input.contactLine?.trim().length ?? 0) > MAX_BRAND_LINE) {
    return `Keep the line under the name to ${MAX_BRAND_LINE} characters.`;
  }
  return null;
}

/** Tidy a brand for storage. Never throws; unknown shapes become an empty one. */
export function cleanBrand(account: string, raw: unknown): BusinessBrand {
  const value = (raw ?? {}) as Partial<BusinessBrand>;
  return {
    account,
    name: typeof value.name === "string" ? value.name.trim().slice(0, MAX_BRAND_NAME) : "",
    logoMediaId: typeof value.logoMediaId === "string" ? value.logoMediaId.trim().slice(0, 80) : "",
    contactLine: typeof value.contactLine === "string" ? value.contactLine.trim().slice(0, MAX_BRAND_LINE) : "",
    enabled: value.enabled === true,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

/**
 * What the printed document should actually use, or null for the White Glove
 * one.
 *
 * TWO CONDITIONS, BOTH CHECKED IN ONE PLACE. The plan has to allow it and the
 * business has to have turned it on with a name to show. A brand that survives
 * a downgrade in the store but is refused here is the correct behaviour: their
 * settings are still there if they come back, and nothing of theirs was
 * deleted because a card expired.
 */
export type PrintBrand = { name: string; logoUrl: string; contactLine: string };

export function printBrandFor(brand: BusinessBrand | null | undefined, allowed: boolean): PrintBrand | null {
  if (!allowed || !brand?.enabled) return null;
  const name = brand.name.trim();
  if (!name) return null;
  return {
    name,
    logoUrl: brand.logoMediaId ? `/api/media?id=${encodeURIComponent(brand.logoMediaId)}` : "",
    contactLine: brand.contactLine.trim(),
  };
}

/** What the account page says about the brand as it stands. Never empty. */
export function describeBrand(brand: BusinessBrand | null, allowed: boolean): string {
  if (!allowed) {
    return "Itineraries you print carry the White Glove cover. Advisor Pro can put its own name and logo on them instead.";
  }
  if (!brand?.enabled || !brand.name.trim()) {
    return "Your itineraries carry the White Glove cover. Turn this on to put your own name and logo on them instead.";
  }
  return brand.logoMediaId
    ? `Itineraries you print carry your logo and "${brand.name}".`
    : `Itineraries you print are headed "${brand.name}". Add a logo and it will sit on the cover.`;
}
