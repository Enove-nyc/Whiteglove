// Where a trip sits in a planner's pipeline — pure data model + one pure
// transform, the same discipline data/itinerary.ts and data/proposal.ts keep.
//
// THE STAGE IS DERIVED, NOT A SECOND STATUS TO KEEP IN SYNC. A trip's own
// proposal (data/proposal.ts) already carries a status a client's actions
// move it through, and its own dates already say whether it is upcoming, in
// progress or over. Inventing a parallel "trip.stage" a planner sets by hand
// would drift the moment either of those changed and nobody remembered to
// update it — a trip could say "Confirmed" a week after it ended. So nothing
// here is stored except the two earliest stages, which have no other signal
// to read from: an inquiry that has not yet become active planning. The
// moment a proposal exists, or the trip's dates put it in the past, that
// manual flag stops being consulted at all.

import type { Proposal } from "@/data/proposal";

export type TripStage = "inquiry" | "planning" | "proposal" | "awaiting_approval" | "confirmed" | "traveling" | "completed";

/** The only two stages a planner ever sets by hand — see the file note above. */
export type ManualTripStage = "inquiry" | "planning";

export const TRIP_STAGE_LABEL: Record<TripStage, string> = {
  inquiry: "Inquiry",
  planning: "Planning",
  proposal: "Proposal",
  awaiting_approval: "Awaiting approval",
  confirmed: "Confirmed",
  traveling: "Traveling",
  completed: "Completed",
};

/** Board order, earliest to latest. */
export const TRIP_STAGE_ORDER: TripStage[] = [
  "inquiry",
  "planning",
  "proposal",
  "awaiting_approval",
  "confirmed",
  "traveling",
  "completed",
];

/**
 * Where a trip sits in the pipeline right now.
 *
 * `today` is a caller-supplied YYYY-MM-DD (the server's date) rather than
 * read here, so this stays a pure function a test can call at any date.
 */
export function tripStage(
  trip: { pipelineStage?: ManualTripStage; proposal?: Proposal; startDate?: string; endDate?: string },
  today: string,
): TripStage {
  const proposal = trip.proposal;
  if (!proposal || proposal.options.length === 0) {
    return trip.pipelineStage === "planning" ? "planning" : "inquiry";
  }
  if (proposal.status === "draft") return "proposal";
  if (proposal.status === "sent" || proposal.status === "viewed" || proposal.status === "changes_requested") {
    return "awaiting_approval";
  }
  // approved or confirmed — the client has said yes; only the calendar decides the rest.
  if (!trip.startDate) return "confirmed";
  if (today < trip.startDate) return "confirmed";
  if (trip.endDate && today > trip.endDate) return "completed";
  return "traveling";
}

/** True when a client asked for changes the planner hasn't answered yet. */
export function needsAttention(proposal?: Proposal): boolean {
  return proposal?.status === "changes_requested";
}
