/**
 * A verified listing is a claim, not a status badge.
 *
 * The destination editor already has per-listing verification. This is the
 * rule that keeps "Verified" honest: a source and a date, or it is not
 * verified. Callers must not stamp today's date on every save.
 */

export type ListingVerificationInput = {
  verification: string;
  sourceUrl: string | null | undefined;
  lastVerified: Date | null | undefined;
};

export function verifiedListingProblem(fields: ListingVerificationInput): string | null {
  if (fields.verification !== "VERIFIED") return null;
  if (!fields.sourceUrl?.trim()) return "A verified listing needs a source.";
  if (!fields.lastVerified || Number.isNaN(fields.lastVerified.getTime())) {
    return "A verified listing needs the date it was checked.";
  }
  return null;
}

export function assertVerifiedListing(fields: ListingVerificationInput): void {
  const problem = verifiedListingProblem(fields);
  if (problem) throw new Error(problem);
}
