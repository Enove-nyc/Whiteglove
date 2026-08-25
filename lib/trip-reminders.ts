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

/**
 * THE SAME REMINDER, AS A NOTIFICATION — and deliberately not the same words.
 *
 * A message in the thread is read by somebody who has opened their trip. A
 * push notification is read off a lock screen, in a queue, on a train, by
 * whoever is standing there. Two things follow, and they are the whole reason
 * these are separate functions rather than a call to the *Text ones:
 *
 *   NO GREETING BY NAME. "Hi Chaya —" on a lock screen tells the person
 *   behind you who owns the phone. Harmless in a thread they had to unlock to
 *   reach; not something to broadcast.
 *
 *   NO AMOUNT OF MONEY. The balance reminder says a balance is due and stops.
 *   What somebody owes for their trip is theirs, and a figure on a lock screen
 *   is shown to the room. The number is one tap away in the app, where it was
 *   always going to be read anyway.
 *
 * The departure reminder keeps its date: a date is not private in the way a
 * name or a sum is, and a notification that will not say when is not worth
 * sending.
 */
export type ReminderPush = { title: string; body: string };

export function departureReminderPush(trip: ReminderTrip): ReminderPush {
  return {
    title: `Leaving in ${DEPARTURE_REMINDER_DAYS} days`,
    body: `${trip.name}${trip.startDate ? ` starts ${trip.startDate}` : ""}. Open your trip for the details.`,
  };
}

export function balanceDueReminderPush(trip: ReminderTrip): ReminderPush {
  return {
    title: "A balance is still due",
    body: `${trip.name}${trip.startDate ? ` leaves ${trip.startDate}` : ""}. Open your trip to see what is outstanding.`,
  };
}
