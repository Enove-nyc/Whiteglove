/**
 * Curated candidate source for internal Trello review.
 *
 * Only the source-attributed editorial pack is eligible here. This module does
 * not read the general bulk-import queue, write a public listing, or change a
 * candidate's publication status.
 */

import { worldwideBatch2Candidates } from "@/data/imports/worldwide-batch-2/candidates";
import type { TrelloCandidateReviewCandidate, TrelloCandidateReviewStatus } from "@/lib/trello-candidate-review";

export const TRELLO_EDITORIAL_CANDIDATE_SOURCE_LABEL = "Worldwide editorial review pack";

function worldwideTypeLabel(entityType: (typeof worldwideBatch2Candidates)[number]["entityType"]): string {
  switch (entityType) {
    case "vacation_destination":
      return "Vacation destination";
    case "stay_anchor":
      return "Where to stay anchor";
    case "kosher_travel_resource":
      return "Kosher travel resource";
    default:
      return "Attraction";
  }
}

function hasRequiredProvenance(candidate: (typeof worldwideBatch2Candidates)[number]): boolean {
  return [
    candidate.sourceId,
    candidate.sourceUrl,
    candidate.sourceName,
    candidate.sourceAttribution,
    candidate.sourceEvidence,
    candidate.sourceLastChecked,
  ].every((value) => value.trim().length > 0);
}

function fromWorldwideCandidate(candidate: (typeof worldwideBatch2Candidates)[number]): TrelloCandidateReviewCandidate {
  return {
    candidateId: candidate.sourceId,
    batchLabel: TRELLO_EDITORIAL_CANDIDATE_SOURCE_LABEL,
    name: candidate.name,
    typeLabel: worldwideTypeLabel(candidate.entityType),
    category: candidate.category,
    destination: candidate.destination || candidate.locality,
    country: candidate.country,
    sourceUrl: candidate.sourceUrl,
    sourceId: candidate.sourceId,
    sourceName: candidate.sourceName,
    attribution: candidate.sourceAttribution,
    license: null,
    sourceType: candidate.sourceType,
    sourceEvidence: candidate.sourceEvidence,
    sourceLastChecked: candidate.sourceLastChecked,
    status: candidate.publicationReadiness as TrelloCandidateReviewStatus,
  };
}

export type TrelloCandidateReviewCandidateSet = {
  candidates: TrelloCandidateReviewCandidate[];
  sourceLabel: string;
  sourceAvailable: boolean;
  withheldForMissingProvenance: number;
};

/**
 * The editorial pack is intentionally held apart from the general import
 * pipeline. Each candidate must retain a complete source trail before it can
 * appear in an internal review export or a Trello card.
 */
export function getTrelloCandidateReviewCandidates(): TrelloCandidateReviewCandidateSet {
  const reviewable = worldwideBatch2Candidates.filter((candidate) => candidate.publicationReadiness === "NEEDS_REVIEW");
  const candidates = reviewable
    .filter(hasRequiredProvenance)
    .map(fromWorldwideCandidate)
    .sort((a, b) => a.name.localeCompare(b.name, "en") || a.candidateId.localeCompare(b.candidateId, "en"));

  return {
    candidates,
    sourceLabel: TRELLO_EDITORIAL_CANDIDATE_SOURCE_LABEL,
    sourceAvailable: candidates.length > 0,
    withheldForMissingProvenance: reviewable.length - candidates.length,
  };
}
