import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { pushableAlerts, tripAlerts, type TripAlert } from "@/lib/trip-alerts";
import type { StopFacts } from "@/lib/command-center";
import { tripReadiness } from "@/lib/command-center";

/**
 * The command centre's alerts, sent rather than waited on.
 *
 * The page has always computed these fresh on every open, which is right for
 * a page and the exact reason none of it could be sent: something that sends
 * needs to know whether it has said this before, and "You leave in 5 days,
 * and 2 stops still need something" is a different sentence tomorrow about
 * the identical situation.
 */

function stop(over: Partial<StopFacts> = {}): StopFacts {
  return {
    id: "s1",
    name: "Lizhensk",
    plannedDate: "2026-06-13", // a Shabbos
    coordinates: "50.2680,22.4200",
    contacts: [{ label: "Shomer", phone: "+48 111 222 333" }],
    isKever: true,
    ...over,
  };
}

function alertsFor(stops: StopFacts[], today: string, startDate?: string): TripAlert[] {
  return tripAlerts({ stops, readiness: tripReadiness(stops), startDate, today });
}

describe("an alert keeps the same identity while it is the same problem", () => {
  it("does not change its key as the countdown ticks down", () => {
    // THE BUG THIS EXISTS TO PREVENT. Keyed on the headline, this alert is a
    // new alert every single morning until departure, and somebody who is
    // notified daily about a thing they already know turns notifications off
    // — taking the Shabbos one with them.
    const stops = [stop({ plannedDate: "2026-07-01", coordinates: undefined, contacts: [] })];
    const far = alertsFor(stops, "2026-06-10", "2026-06-20").find((a) => a.kind === "leaving-soon");
    const near = alertsFor(stops, "2026-06-18", "2026-06-20").find((a) => a.kind === "leaving-soon");
    assert.ok(far && near, "both days should raise the leaving-soon alert");
    assert.notEqual(far.headline, near.headline, "the wording does change day to day — that is the trap");
    assert.equal(far.key, near.key, "the key must not");
  });

  it("does not change its key when a different stop is the one outstanding", () => {
    // Fixing one of three and leaving two is not news; it is the same alert
    // with a smaller list, and the page is where that list belongs.
    const three = [stop({ id: "a", contacts: [] }), stop({ id: "b", contacts: [] }), stop({ id: "c", contacts: [] })];
    const two = three.slice(1);
    const a = alertsFor(three, "2026-06-10", "2026-06-20").find((x) => x.kind === "leaving-soon");
    const b = alertsFor(two, "2026-06-10", "2026-06-20").find((x) => x.kind === "leaving-soon");
    assert.equal(a?.key, b?.key);
  });

  it("DOES change its key when a different stop falls on Shabbos", () => {
    // The other half of the rule. Moving Lizhensk off Shabbos and putting
    // Uman on it is a new problem and has to be said again, or the one time
    // this matters is the time it stays quiet.
    const first = alertsFor([stop({ id: "lizhensk" })], "2026-06-01", "2026-06-10").find((a) => a.kind === "shabbos");
    const second = alertsFor([stop({ id: "uman" })], "2026-06-01", "2026-06-10").find((a) => a.kind === "shabbos");
    assert.ok(first && second);
    assert.notEqual(first.key, second.key);
  });

  it("does not change its key when the same stops are merely reordered", () => {
    const a = alertsFor([stop({ id: "x" }), stop({ id: "y" })], "2026-06-01", "2026-06-10").find((v) => v.kind === "shabbos");
    const b = alertsFor([stop({ id: "y" }), stop({ id: "x" })], "2026-06-01", "2026-06-10").find((v) => v.kind === "shabbos");
    assert.equal(a?.key, b?.key);
  });

  it("gives every alert a key at all", () => {
    const all = alertsFor([stop(), stop({ id: "n", plannedDate: undefined })], "2026-06-01", "2026-06-10");
    assert.ok(all.length > 0);
    for (const alert of all) assert.ok(alert.key?.trim(), `${alert.kind} has no key`);
  });
});

describe("what is worth waking a phone for", () => {
  it("never pushes 'no dates yet'", () => {
    // True for weeks, urgent on none of them, and it amounts to "you have not
    // finished typing". A page can say that quietly; a notification cannot say
    // it at all without costing the two that matter.
    const undated = [stop({ plannedDate: undefined }), stop({ id: "s2", plannedDate: undefined })];
    const raised = alertsFor(undated, "2026-06-01");
    assert.ok(raised.some((a) => a.kind === "no-dates"), "the page should still raise it");
    assert.ok(!pushableAlerts(raised).some((a) => a.kind === "no-dates"), "and it should never be pushed");
  });

  it("still pushes the Shabbos clash and the loose ends", () => {
    const raised = alertsFor([stop({ contacts: [] })], "2026-06-10", "2026-06-13");
    const pushable = pushableAlerts(raised).map((a) => a.kind);
    assert.ok(pushable.includes("shabbos"));
    assert.ok(pushable.includes("leaving-soon"));
  });
});

describe("the sending job", () => {
  const ROUTE = readFileSync("app/api/cron/trip-alerts/route.ts", "utf8");

  it("refuses to run without its own secret, and fails closed if unset", () => {
    assert.match(ROUTE, /process\.env\.CRON_SECRET/);
    assert.match(ROUTE, /Not configured/);
    assert.match(ROUTE, /authorization.*!==.*Bearer \$\{secret\}/);
  });

  it("marks an alert sent BEFORE pushing it, never after", () => {
    // Same order and same reason as the client reminders: a failed push costs
    // one notification, whereas a mark that waited on it would send this alert
    // again tomorrow, and every morning after.
    const mark = ROUTE.indexOf("markAlertsPushed");
    const push = ROUTE.indexOf("pushToAccountSubscribers(account.email");
    assert.ok(mark > 0 && push > 0);
    assert.ok(mark < push, "the alert must be marked before it is pushed");
  });

  it("skips an account it cannot reach at all, before doing the expensive part", () => {
    // stopsForTrip reads the database once per kever. Paying that to compute
    // alerts with nowhere to send them would make a nightly job across every
    // account in the database far more expensive than it needs to be.
    //
    // The guard was once "no push subscription" and is now "no push AND no
    // address", because email needs nothing turned on — see the email tests
    // at the foot of this file. What it protects is unchanged.
    const skip = ROUTE.indexOf("if (!canPush && !canEmail) continue;");
    const work = ROUTE.indexOf("await stopsForTrip");
    assert.ok(skip > 0 && work > 0);
    assert.ok(skip < work, "the reachability check must come before the reads");
  });

  it("only looks at trips actually coming up", () => {
    assert.match(ROUTE, /HORIZON_DAYS/);
    assert.match(ROUTE, /away < 0 \|\| away > HORIZON_DAYS/);
  });

  it("sends nothing it has already sent", () => {
    assert.match(ROUTE, /trip\.alertsPushed \?\? \{\}/);
    assert.match(ROUTE, /alerts\.filter\(\(alert\) => !already\[alert\.key\]\)/);
  });

  it("is gated on nothing but being signed in, unlike the advisor's reminders", () => {
    // Deliberate: /command-center is open to any signed-in traveller, so the
    // notification version of it must be too. The check that does NOT belong
    // here is the client-serving plan gate — copying it across would silently
    // limit this to advisors.
    assert.doesNotMatch(ROUTE, /mayServeCompanionClients/);
  });
});

describe("a traveller can only ever subscribe their own phone to their own trips", () => {
  const ENDPOINT = readFileSync("app/api/account/push/route.ts", "utf8");

  it("takes the account from the signed cookie, never from the request body", () => {
    // The failure this prevents is the worst one available here: an endpoint
    // that trusted an email in the body would let anybody subscribe to a
    // stranger's trips, which is a live feed of where they are going and when.
    assert.match(ENDPOINT, /readSessionEmail\(cookieStore\.get\(accountCookieName\(\)\)\?\.value\)/);
    assert.match(ENDPOINT, /if \(!email\) return NextResponse\.json\([^]*?401/);
    assert.doesNotMatch(ENDPOINT, /body\??\.\s*email/);
  });

  it("refuses a request that did not come from this site", () => {
    assert.match(ENDPOINT, /sameOrigin\(request\)/);
  });

  it("validates the subscription rather than storing whatever arrived", () => {
    assert.match(ENDPOINT, /isValidSubscription/);
  });
});

describe("the owner's devices are kept apart from a client's", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("stores them on the account, not on one trip", () => {
    // A client has no account — only the link they were sent — so their phone
    // can only belong to that trip. Somebody who owns the account has several
    // trips and one phone.
    assert.match(STORE, /export async function saveAccountPushSubscription/);
    assert.match(STORE, /export async function pushToAccountSubscribers/);
    const fn = STORE.slice(STORE.indexOf("export async function saveAccountPushSubscription"), STORE.indexOf("export async function removeAccountPushSubscription"));
    assert.match(fn, /writeJson\(dataKey\(normalized\), next\)/);
    assert.doesNotMatch(fn, /writeTrips/);
  });

  it("forgets a device the push service says is gone", () => {
    const fn = STORE.slice(STORE.indexOf("export async function pushToAccountSubscribers"), STORE.indexOf("export async function markAlertsPushed"));
    assert.match(fn, /filter\(\(s\) => !expired\.includes\(s\.endpoint\)\)/);
  });

  it("cannot fail the caller it was announcing something for", () => {
    const fn = STORE.slice(STORE.indexOf("export async function pushToAccountSubscribers"), STORE.indexOf("export async function markAlertsPushed"));
    assert.match(fn, /try \{/);
    assert.match(fn, /catch \(error\) \{[^]*?return 0;/);
  });
});

describe("the evening before", () => {
  const ROUTE = readFileSync("app/api/cron/trip-alerts/route.ts", "utf8");

  it("is not a readiness alert, and never appears on the command centre as one", () => {
    // tripAlerts is about things that are WRONG. A trip starting is the
    // opposite, and putting it there would draw it as a warning box beside the
    // Shabbos clash — next to a countdown already saying the same thing in the
    // right voice.
    const alerts = readFileSync("lib/trip-alerts.ts", "utf8");
    // The key, not the word: "tomorrow" appears there legitimately, in the
    // check that decides whether leaving soon is urgent. What must not exist
    // there is an alert kind for a trip beginning.
    assert.doesNotMatch(alerts, /starts-tomorrow/);
    assert.doesNotMatch(alerts, /kind: "(starting|departure|countdown)/);
    assert.match(ROUTE, /starts-tomorrow/);
  });

  it("fires on the calendar day before, not on a rolling day", () => {
    // `away` is whole days between two dates, so this is the evening before
    // departure rather than "within twenty-four hours", which would land at
    // an arbitrary hour and sometimes twice.
    assert.match(ROUTE, /const eve = away === 1 && !already\["starts-tomorrow"\]/);
  });

  it("goes once, marked like every other line", () => {
    assert.match(ROUTE, /if \(eve\) keys\.push\("starts-tomorrow"\)/);
    assert.match(ROUTE, /markAlertsPushed\(account\.email, trip\.id, keys, today\)/);
  });

  it("wakes the phone once when the trip both starts tomorrow and has loose ends", () => {
    // Two notifications on the one evening somebody can still act on either is
    // how people turn notifications off.
    const body = ROUTE.slice(ROUTE.indexOf("pushed += await pushToAccountSubscribers"));
    assert.equal((body.match(/pushToAccountSubscribers/g) ?? []).length, 1);
    assert.match(body, /eve && !fresh\.length/);
    assert.match(body, /: eve\s*\?/);
  });

  it("says something the traveller does not already know", () => {
    // "Your trip starts tomorrow" on its own tells somebody a thing they are
    // thinking about. The first stop is the question they actually have.
    assert.match(ROUTE, /function startsTomorrowBody/);
    assert.match(ROUTE, /First stop: \$\{first\}/);
  });

  it("still runs when the trip is otherwise clean", () => {
    // The bug this prevents: `if (!fresh.length) continue` skipping the eve
    // notification on a trip with nothing wrong with it — which is most of
    // them, and exactly the ones worth a quiet word the night before.
    assert.match(ROUTE, /if \(!fresh\.length && !eve\) continue;/);
  });
});

describe("the countdown on the shared link", () => {
  const SHARED = readFileSync("app/i/[shareId]/page.tsx", "utf8");

  it("shows the strip, which is what the person travelling actually opens", () => {
    assert.match(SHARED, /import TripProgressStrip/);
    assert.match(SHARED, /<TripProgressStrip startDate=\{itin\.startDate\} endDate=\{itin\.endDate\} days=\{days\} \/>/);
  });

  it("hands it no documents and no trip id", () => {
    // A shared trip is served through withoutAttachments, so a boarding pass
    // never reaches this page — the holder of the link is not even told one
    // exists. Leaving the prop off keeps that true rather than relying on the
    // array happening to be empty. And rating how White Glove did belongs to
    // whoever's trip it is, not to everybody they sent it to.
    const tag = SHARED.slice(SHARED.indexOf("<TripProgressStrip"), SHARED.indexOf("/>", SHARED.indexOf("<TripProgressStrip")));
    assert.doesNotMatch(tag, /documentsToday/);
    assert.doesNotMatch(tag, /tripId/);
  });

  it("is not on the printed copy, and that is the decision", () => {
    // A countdown on paper is wrong the day after it is printed, and "you
    // leave tomorrow" on a sheet found in a drawer next year is worse than
    // nothing. The printed cover states the dates instead, which stays true.
    assert.doesNotMatch(readFileSync("components/PrintableItinerary.tsx", "utf8"), /TripProgressStrip/);
    assert.doesNotMatch(readFileSync("app/itinerary/print/page.tsx", "utf8"), /TripProgressStrip/);
    assert.match(readFileSync("components/PrintableItinerary.tsx", "utf8"), /label: "When", value: dates/);
  });
});

describe("the alerts reach somebody who never turned notifications on", () => {
  const ROUTE = readFileSync("app/api/cron/trip-alerts/route.ts", "utf8");
  const EMAIL = readFileSync("lib/email.ts", "utf8");

  it("emails them as well as pushing", () => {
    // A push has to be turned on, on a device, by somebody who thought to.
    // These are the two alerts that get worse the longer nobody notices, so
    // the channel that needs no setup is the one that must not be missing.
    assert.match(ROUTE, /sendTripAlertsEmail\(account\.email,/);
    assert.match(EMAIL, /export async function sendTripAlertsEmail/);
  });

  it("no longer skips an account just because it has no phone subscribed", () => {
    // The old guard was "no push subscription", right while a phone was the
    // only channel. Left alone, adding email would have changed nothing for
    // exactly the people it was added for.
    assert.match(ROUTE, /const canPush = Boolean\(data\.pushSubscriptions\?\.length\)/);
    assert.match(ROUTE, /const canEmail = !isPhoneIdentity\(account\.email\)/);
    assert.match(ROUTE, /if \(!canPush && !canEmail\) continue;/);
  });

  it("still skips before the expensive part when there is no way to reach them", () => {
    // stopsForTrip is a database read per kever. Paying it to compute alerts
    // with nowhere to go is the cost this guard exists to avoid, and it has to
    // stay ahead of the reads.
    const skip = ROUTE.indexOf("if (!canPush && !canEmail) continue;");
    const work = ROUTE.indexOf("await stopsForTrip");
    assert.ok(skip > 0 && work > 0);
    assert.ok(skip < work);
  });

  it("emails only the readiness alerts, never the countdown", () => {
    // A trip starting tomorrow is a good enough reason to buzz a phone and not
    // a good enough reason to email somebody about a date they chose.
    assert.match(ROUTE, /if \(canEmail && fresh\.length\) \{/);
  });

  it("counts as sent only what actually sent, and cannot fail the run", () => {
    assert.match(ROUTE, /\.catch\(\(\) => false\)/);
    assert.match(ROUTE, /if \(sent\) emailed \+= 1;/);
    assert.match(ROUTE, /\{ ok: true, considered, pushed, emailed \}/);
  });

  it("is still once per alert, whatever the channel", () => {
    // The keys are marked before either channel is used, so somebody with a
    // phone AND an address is told once about a Shabbos clash rather than
    // every morning in two places.
    const mark = ROUTE.indexOf("markAlertsPushed(account.email");
    const push = ROUTE.indexOf("pushToAccountSubscribers(account.email");
    const mail = ROUTE.indexOf("sendTripAlertsEmail(account.email");
    assert.ok(mark > 0 && push > 0 && mail > 0);
    assert.ok(mark < push && mark < mail, "the keys must be recorded before anything is sent");
  });

  it("escapes what a traveller typed", () => {
    // A stop's name and note go into the HTML body.
    const fn = EMAIL.slice(EMAIL.indexOf("export async function sendTripAlertsEmail"), EMAIL.indexOf("export async function sendPasswordResetEmail"));
    assert.match(fn, /escapeHtml\(alert\.headline\)/);
    assert.match(fn, /escapeHtml\(alert\.detail\)/);
    assert.match(fn, /escapeHtml\(opts\.tripTitle/);
  });
});
