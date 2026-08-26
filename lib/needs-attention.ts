import type { ReminderReason } from "@/data/trip-reminders";

/**
 * One thing that needs attention, and the ONE thing to press about it.
 *
 * WHAT THIS FIXES. The pipeline told a planner six different things could need
 * doing — a proposal gone quiet, a payment due, add-ons waiting on an answer, a
 * trip starting unconfirmed — and gave them something to press for exactly one
 * of the six. The other five were a sentence with a flag in front of it. The
 * planner read "2 add-ons still waiting on an answer", agreed, and then had to
 * work out for themselves which screen answers add-ons.
 *
 * ONE ACTION, NOT A LIST, and the type is what enforces it: `action` is a
 * single value, so there is no way to express "here are four things you could
 * do", which is how a work queue turns back into a menu. If a second action
 * ever genuinely belongs on an item, that is a decision to make deliberately,
 * not something that arrives because the field happened to be an array.
 *
 * A RECORD OVER THE UNION, NOT A LOOKUP WITH A FALLBACK. Adding a reminder
 * reason to data/trip-reminders.ts and forgetting it here is a compile error
 * rather than an item that silently renders with no action — which is the
 * state five of the six were already in.
 *
 * WHY THE PATHS ARE THE THREE THE ROW ALREADY OPENS. The pipeline card carries
 * "Open itinerary", "Proposal" and "Payments" buttons that already resolve to
 * the right trip. Sending an attention item anywhere else would mean inventing
 * a route, and the honest answer for all five is a screen that exists.
 */

/** Where a pipeline row can already take a planner, for the trip it is about. */
export type AttentionPath = "/itinerary" | "/proposal" | "/payments";

export type AttentionAction =
  /** Open one of the trip's own screens. */
  | { kind: "open"; label: string; path: AttentionPath }
  /**
   * Handled where it is read, because leaving the page would lose the point.
   * The rating request asks for an address and sends — a screen of its own for
   * one field would be worse than the flag it replaces.
   */
  | { kind: "inline"; label: string; control: "rating-request" };

export const REMINDER_ACTION: Record<ReminderReason, AttentionAction> = {
  // "Sent 5 days ago with no response" — the follow-up is on the proposal.
  proposal_stale: { kind: "open", label: "Open the proposal", path: "/proposal" },
  // "Expires in 2 days" — same screen, where the date can be moved.
  proposal_expiring: { kind: "open", label: "Open the proposal", path: "/proposal" },
  // A scheduled instalment coming due. Payments is where the schedule lives.
  payment_due_soon: { kind: "open", label: "Open payments", path: "/payments" },
  // Add-ons are offered and answered as part of the proposal, so that is where
  // a planner chases one that has been waiting.
  addon_pending: { kind: "open", label: "Open the proposal", path: "/proposal" },
  // "Starts in 9 days — nothing confirmed yet." The itinerary is the thing
  // that is not confirmed.
  trip_soon_unconfirmed: { kind: "open", label: "Open the itinerary", path: "/itinerary" },
  // The one that already had an action, kept as it was.
  trip_completed_no_rating_sent: { kind: "inline", label: "Send a rating request", control: "rating-request" },
};

/** The action for a reminder. Total by construction — see the note above. */
export function actionForReminder(reason: ReminderReason): AttentionAction {
  return REMINDER_ACTION[reason];
}
