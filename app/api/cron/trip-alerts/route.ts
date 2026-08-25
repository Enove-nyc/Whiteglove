import { NextRequest, NextResponse } from "next/server";
import {
  getAccountData,
  listAllAccounts,
  markAlertsPushed,
  pushToAccountSubscribers,
  withTrips,
} from "@/lib/account-store";
import { stopsForTrip } from "@/lib/command-center-data";
import { tripReadiness } from "@/lib/command-center";
import { pushableAlerts, tripAlerts, type TripAlert } from "@/lib/trip-alerts";

export const dynamic = "force-dynamic";

/**
 * How far ahead a trip has to be before this bothers looking at it.
 *
 * The command centre is a page about the last few weeks before travelling.
 * Nothing here is news a year out, and walking every trip in the database
 * every night to work out that somebody's 2028 trip still has no shomer
 * number would cost a database read per stop for an answer nobody wants yet.
 */
const HORIZON_DAYS = 45;

/** Days from `today` to `date`, or null if either is missing or unparseable. */
function daysBetween(date: string | undefined, today: string): number | null {
  if (!date?.trim()) return null;
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

/** One notification, however many alerts this trip turned up. */
function payloadFor(tripName: string, alerts: readonly TripAlert[]) {
  if (alerts.length === 1) return { title: alerts[0].headline, body: tripName };
  return { title: `${alerts.length} things to look at`, body: `${tripName} — ${alerts.map((a) => a.headline).join(" ")}` };
}

/**
 * Sends the traveller their OWN trip's readiness alerts — the Shabbos clash,
 * the loose ends as departure gets close — to the devices they turned on at
 * /command-center.
 *
 * WHY THIS EXISTS AT ALL. Everything the command centre knows, it has always
 * known; it just waited to be asked. The two alerts it leads with are the two
 * that get worse the longer nobody notices, and a kever visit planned for
 * Shabbos found three weeks out is a different problem from the same one found
 * standing in a hotel lobby in Poland. A page cannot help with that. This can.
 *
 * SEPARATE FROM trip-reminders ON PURPOSE, though both run daily. That one is
 * an ADVISOR's message to their CLIENT, gated on the plan that lets somebody
 * serve clients at all, landing in a chat thread. This is the account owner
 * being told about their own trip, open to anybody signed in, landing on their
 * own phone. Folding them together would mean one plan check standing in front
 * of two audiences, which is exactly the sort of thing that quietly starts
 * gating the wrong one.
 *
 * ONCE PER ALERT, NOT ONCE PER DAY. The alerts are recomputed from nothing
 * every run, so without a memory this would send the same Shabbos clash every
 * morning until it was fixed — and the person would turn notifications off,
 * taking the useful ones with them. markAlertsPushed records each alert's
 * stable key (see lib/trip-alerts.ts) and this skips anything already there.
 *
 * Same secret and same fail-closed rule as the reminders endpoint: not
 * configured means refused.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] trip-alerts ran but CRON_SECRET is not set.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let considered = 0;
  let pushed = 0;

  for (const account of await listAllAccounts()) {
    const data = await getAccountData(account.email);
    // Nobody has asked to be told. Skip before doing any of the work below —
    // reading a trip's stops means a database read per kever, and there is no
    // point paying it to compute alerts that have nowhere to go.
    if (!data.pushSubscriptions?.length) continue;

    for (const trip of withTrips(data).trips) {
      const startDate = trip.itinerary?.startDate;
      const away = daysBetween(startDate, today);
      // A trip with no dates is skipped rather than reported: the one alert it
      // would raise is "no dates yet", which pushableAlerts drops anyway.
      if (away === null || away < 0 || away > HORIZON_DAYS) continue;

      considered += 1;
      const stops = await stopsForTrip(trip.itinerary);
      if (!stops.length) continue;

      const alerts = pushableAlerts(
        tripAlerts({
          stops,
          readiness: tripReadiness(stops),
          startDate,
          today,
          timesById: Object.fromEntries((trip.itinerary.activities ?? []).map((a) => [a.id, a.startTime])),
        }),
      );
      const already = trip.alertsPushed ?? {};
      const fresh = alerts.filter((alert) => !already[alert.key]);
      if (!fresh.length) continue;

      // Marked first, then pushed — the same order as the client reminders,
      // and for the same reason. A push that fails costs one notification; a
      // mark that waited on it and never happened would send this alert again
      // tomorrow, and every morning after.
      await markAlertsPushed(account.email, trip.id, fresh.map((a) => a.key), today);
      pushed += await pushToAccountSubscribers(account.email, {
        ...payloadFor(trip.name || trip.itinerary.title || "Your trip", fresh),
        url: "/command-center",
      });
    }
  }

  return NextResponse.json({ ok: true, considered, pushed });
}
