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

/** Just what the business-at-a-glance strip needs from one pipeline row. */
export type PipelineStatsRow = {
  stage: TripStage;
  startDate: string;
  outstandingCents?: number;
  currency?: string;
  /** What the advisor recorded earning on this trip — theirs to type in, not derived from the booking. */
  commissionCents?: number;
  commissionCurrency?: string;
};

export type PipelineStats = {
  /** Every trip not yet completed. */
  activeCount: number;
  /** Trips confirmed and leaving within the next 30 days. */
  departingSoon: number;
  /**
   * What clients still owe, summed per currency rather than into one number
   * — a business billing some clients in USD and others in EUR has two real
   * totals, not one wrong one. Only currencies with something outstanding.
   */
  outstandingByCurrency: Array<[currency: string, cents: number]>;
  /**
   * What the advisor has recorded earning, summed per currency. Same
   * per-currency discipline as outstandingByCurrency, and the same honesty
   * about where the number comes from: this is the advisor's own ledger
   * entry per trip, not a percentage worked out from a booking.
   */
  commissionByCurrency: Array<[currency: string, cents: number]>;
};

/**
 * The business, at a glance — the roll-up above the row-by-row board.
 *
 * `today` is caller-supplied, the same reason tripStage takes it: this stays
 * a pure function a test can call at any date, not one that reads the clock.
 */
export function pipelineStats(rows: readonly PipelineStatsRow[], today: string): PipelineStats {
  const activeCount = rows.filter((r) => r.stage !== "completed").length;

  const cutoff = today ? new Date(Date.parse(`${today}T00:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10) : "";
  const departingSoon = today
    ? rows.filter((r) => r.stage === "confirmed" && r.startDate >= today && r.startDate <= cutoff).length
    : 0;

  const byCurrency = new Map<string, number>();
  for (const r of rows) {
    if (!r.outstandingCents || !r.currency) continue;
    byCurrency.set(r.currency, (byCurrency.get(r.currency) ?? 0) + r.outstandingCents);
  }

  const commissionByCurrency = new Map<string, number>();
  for (const r of rows) {
    if (!r.commissionCents || !r.commissionCurrency) continue;
    commissionByCurrency.set(r.commissionCurrency, (commissionByCurrency.get(r.commissionCurrency) ?? 0) + r.commissionCents);
  }

  return {
    activeCount,
    departingSoon,
    outstandingByCurrency: [...byCurrency.entries()].filter(([, cents]) => cents > 0),
    commissionByCurrency: [...commissionByCurrency.entries()].filter(([, cents]) => cents > 0),
  };
}
