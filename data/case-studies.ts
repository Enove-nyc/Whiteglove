/**
 * Genuine social proof — case studies / testimonials the owner may publish.
 *
 * NOTHING SHIPS PUBLIC until a record is complete, permission is recorded, and
 * the owner has approved it. There are no seed quotes. An incomplete or
 * unapproved record is admin-only.
 *
 * Distinct from the sample itinerary (/sample-itinerary), which is an
 * illustrative deliverable shape — not a client outcome.
 */

export type CaseStudy = {
  id: string;
  /** Who may be named, or a short anonymised label (“A family from London”). */
  attribution: string;
  /** When true, public page must not imply a real full name. */
  anonymised: boolean;
  /** Optional place context (city / country). */
  location: string;
  /** Optional trip type (family city break, heritage route, …). */
  tripType: string;
  /** Optional short quote in their words. */
  quote: string;
  /** What they originally asked for. */
  tripRequest: string;
  /** What White Glove solved. */
  whatSolved: string;
  /** How it turned out — outcome in their words or a short factual summary. */
  outcome: string;
  /** Optional link to a public itinerary or destination page on this site. */
  itineraryHref: string;
  /** Explicit permission to publish (owner attests). */
  permissionRecorded: boolean;
  /** Owner has reviewed and approved for the public site. */
  approved: boolean;
  /** ISO date string when approved, or empty. */
  approvedAt: string;
  /** Lower sorts first on public surfaces. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CaseStudyDraft = Omit<CaseStudy, "id" | "createdAt" | "updatedAt" | "approvedAt"> & {
  id?: string;
};

/**
 * Minimum approved studies before a dedicated public /case-studies page exists.
 * One study is enough for a tasteful homepage strip; a whole page needs more.
 */
export const MIN_CASE_STUDIES_FOR_PAGE = 2;

/** Fields required before a study may be approved for the public site. */
export function caseStudyCompleteness(
  study: Pick<CaseStudy, "attribution" | "tripRequest" | "whatSolved" | "outcome" | "permissionRecorded" | "itineraryHref">,
): string | null {
  if (!study.attribution.trim()) return "Say who this is from — a name they agreed to, or an anonymised label.";
  if (!study.tripRequest.trim()) return "What did they ask for?";
  if (!study.whatSolved.trim()) return "What did White Glove solve?";
  if (!study.outcome.trim()) return "What was the outcome?";
  if (!study.permissionRecorded) return "Record that they gave permission to publish before approving.";
  const href = study.itineraryHref.trim();
  if (href && !href.startsWith("/")) {
    return "Itinerary link must be a path on this site, starting with /.";
  }
  return null;
}

/** True only when complete, permitted and explicitly approved. */
export function caseStudyIsPublic(study: CaseStudy): boolean {
  return Boolean(study.approved) && caseStudyCompleteness(study) === null;
}

/** Whether the dedicated public page should exist (and be linked / sitemapped). */
export function caseStudiesPageShouldExist(publicStudies: readonly CaseStudy[]): boolean {
  return publicStudies.length >= MIN_CASE_STUDIES_FOR_PAGE;
}

/** Sort for public display — sortOrder ascending, then newest approved first. */
export function sortCaseStudiesForPublic(studies: CaseStudy[]): CaseStudy[] {
  return [...studies].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return (b.approvedAt || b.updatedAt).localeCompare(a.approvedAt || a.updatedAt);
  });
}
