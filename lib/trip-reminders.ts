/**
 * Whether a trip's automatic client reminder is due, and what it says.
 *
 * Pure and date-driven so a cron run can be tested without a live store — see
 * app/api/cron/trip-reminders/route.ts, the only caller that actually sends
 * anything. OPT-IN, per trip: `autoReminders` starts false on every trip, so
 * nothing is ever sent to a client the advisor did not choose to turn this on
 * for. And each kind fires ONCE, ever, per trip — `remindersSent` marks it —
 * rather than every day a window holds true, which would turn a helpful nudge
 * into the thread being spammed once a day for two weeks.
 */

import { hasBalance, outstandingCents, formatCents, type TripBalance } from "@/data/trip-payments";

/** How many days before departure the "you're leaving soon" reminder fires. */
export const DEPARTURE_REMINDER_DAYS = 3;
/** The reminder fires once a balance is still owed within this many days of departure. */
export const BALANCE_REMINDER_WINDOW_DAYS = 14;

export type ReminderTrip = {
  name: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  autoReminders?: boolean;
  shareId?: string;
  balance?: TripBalance;
  remindersSent?: { departure?: string; balanceDue?: string };
};

function daysUntil(date: string, today: string): number | null {
  if (!date || !today) return null;
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

/** Whether the "leaving soon" reminder should fire today. */
export function departureReminderDue(trip: ReminderTrip, today: string): boolean {
  if (!trip.autoReminders || !trip.shareId || !trip.startDate) return false;
  if (trip.remindersSent?.departure) return false;
  return daysUntil(trip.startDate, today) === DEPARTURE_REMINDER_DAYS;
}

/** Whether the "balance still due" reminder should fire today. */
export function balanceDueReminderDue(trip: ReminderTrip, today: string): boolean {
  if (!trip.autoReminders || !trip.shareId || !trip.startDate || !trip.balance) return false;
  if (trip.remindersSent?.balanceDue) return false;
  if (!hasBalance(trip.balance) || outstandingCents(trip.balance) <= 0) return false;
  const left = daysUntil(trip.startDate, today);
  return left !== null && left >= 0 && left <= BALANCE_REMINDER_WINDOW_DAYS;
}

export function departureReminderText(trip: ReminderTrip): string {
  const greeting = trip.client ? `Hi ${trip.client} — your` : "Your";
  return `${greeting} trip leaves in ${DEPARTURE_REMINDER_DAYS} days${trip.startDate ? ` (${trip.startDate})` : ""}. Reach out here with any last questions.`;
}

export function balanceDueReminderText(trip: ReminderTrip): string {
  const amount = trip.balance ? formatCents(outstandingCents(trip.balance), trip.balance.currency) : "";
  const greeting = trip.client ? `Hi ${trip.client} — a` : "A";
  return `${greeting} balance of ${amount} is still due${trip.startDate ? ` before your trip leaves on ${trip.startDate}` : ""}. Let us know if you have any questions about it.`;
}
