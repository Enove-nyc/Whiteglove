import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { appendChat, type CompanionChatMessage } from "@/lib/companion-chat-store";
import { getAccountData, listAllAccounts, markReminderSent, withTrips } from "@/lib/account-store";
import {
  balanceDueReminderDue,
  balanceDueReminderText,
  departureReminderDue,
  departureReminderText,
} from "@/lib/trip-reminders";

export const dynamic = "force-dynamic";

/**
 * Whether `message` actually landed in the thread — `appendChat` no-ops and
 * returns `[]` when the chat store is unreachable, but a caller that never
 * checked its result would go on to markReminderSent anyway, and these
 * reminders are ONE-SHOT: a "sent" mark that was never really sent means a
 * client silently never sees it, forever, with no retry. `at` is stamped by
 * this route just above and is unique per message, so finding it in the
 * thread that comes back is the same proof appendChat's own callers already
 * rely on (see findRawIndex in lib/companion-chat-store.ts).
 */
async function wasDelivered(shareId: string, message: CompanionChatMessage): Promise<boolean> {
  const thread = await appendChat(shareId, message);
  return thread.some((m) => m.from === message.from && m.at === message.at);
}

/**
 * Sends the automatic client reminders lib/trip-reminders.ts decides are
 * due — "you're leaving soon", "a balance is still due" — into each trip's
 * own chat thread, the same one the advisor and client already talk in.
 *
 * RUN ONCE A DAY BY A GITHUB ACTIONS WORKFLOW, NEVER BY A BROWSER — see
 * .github/workflows/trip-reminders.yml, which calls this with the shared
 * `CRON_SECRET` as a bearer token. The schedule lives there rather than in
 * vercel.json because the site deploys to Railway, where a long-running web
 * service has no scheduler of its own; a `crons` entry in vercel.json was
 * silently inert and sent nothing.
 *
 * There is no other legitimate caller — this endpoint sends a message to a
 * real person, so an open door here is not a quiet bug, it is spam with the
 * site's name on it. Not configured means refused, the same fail-closed rule
 * the billing webhook follows for its own secret.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] trip-reminders ran but CRON_SECRET is not set.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;

  const accounts = await listAllAccounts();
  for (const account of accounts.filter((a) => mayServeCompanionClients(a.plan))) {
    // listAllAccounts' own `plan` field is a snapshot from the scan — read
    // it fresh here too, since a lapsed subscription between the scan and
    // now must not still get to send.
    if (!mayServeCompanionClients(await getPlan(account.email))) continue;

    const data = await getAccountData(account.email);
    const { trips } = withTrips(data);
    for (const trip of trips) {
      const reminderTrip = {
        name: trip.name,
        client: trip.client,
        startDate: trip.itinerary?.startDate,
        endDate: trip.itinerary?.endDate,
        autoReminders: trip.autoReminders,
        shareId: trip.shareId,
        balance: trip.balance,
        remindersSent: trip.remindersSent,
      };
      if (!trip.shareId) continue;

      if (departureReminderDue(reminderTrip, today)) {
        const message: CompanionChatMessage = { from: "advisor", kind: "text", text: departureReminderText(reminderTrip), at: new Date().toISOString() };
        if (await wasDelivered(trip.shareId, message)) {
          await markReminderSent(account.email, trip.id, "departure", today);
          sent += 1;
        } else {
          console.error("[cron] trip-reminders: departure reminder did not save, will retry next run", { account: account.email, tripId: trip.id });
        }
      }
      if (balanceDueReminderDue(reminderTrip, today)) {
        const message: CompanionChatMessage = { from: "advisor", kind: "text", text: balanceDueReminderText(reminderTrip), at: new Date().toISOString() };
        if (await wasDelivered(trip.shareId, message)) {
          await markReminderSent(account.email, trip.id, "balanceDue", today);
          sent += 1;
        } else {
          console.error("[cron] trip-reminders: balance-due reminder did not save, will retry next run", { account: account.email, tripId: trip.id });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
