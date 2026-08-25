import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { emptyTripBalance } from "@/data/trip-payments";
import {
  balanceDueReminderDue,
  balanceDueReminderPush,
  balanceDueReminderText,
  departureReminderDue,
  departureReminderPush,
  departureReminderText,
  DEPARTURE_REMINDER_DAYS,
  type ReminderTrip,
} from "@/lib/trip-reminders";

const TODAY = "2026-06-10";

function trip(over: Partial<ReminderTrip> = {}): ReminderTrip {
  return { name: "Poland trip", startDate: "2026-06-13", shareId: "abc123", autoReminders: true, ...over };
}

describe("the 'leaving soon' reminder", () => {
  it("is due exactly 3 days out", () => {
    assert.equal(DEPARTURE_REMINDER_DAYS, 3);
    assert.equal(departureReminderDue(trip({ startDate: "2026-06-13" }), TODAY), true);
    assert.equal(departureReminderDue(trip({ startDate: "2026-06-14" }), TODAY), false);
    assert.equal(departureReminderDue(trip({ startDate: "2026-06-12" }), TODAY), false);
  });

  it("never fires on a trip that never turned reminders on", () => {
    assert.equal(departureReminderDue(trip({ autoReminders: false }), TODAY), false);
    assert.equal(departureReminderDue(trip({ autoReminders: undefined }), TODAY), false);
  });

  it("never fires with nowhere to send it", () => {
    assert.equal(departureReminderDue(trip({ shareId: undefined }), TODAY), false);
  });

  it("fires once — never again once it has already gone out", () => {
    assert.equal(departureReminderDue(trip({ remindersSent: { departure: "2026-06-09" } }), TODAY), false);
  });

  it("says the trip leaves in 3 days and names the client when there is one", () => {
    assert.match(departureReminderText(trip({ client: "The Cohen family" })), /Hi The Cohen family/);
    assert.match(departureReminderText(trip({ client: "The Cohen family" })), /3 days/);
    assert.match(departureReminderText(trip({ client: undefined })), /^Your trip/);
  });
});

describe("the 'balance still due' reminder", () => {
  function withBalance(totalCents: number, paidCents = 0) {
    return {
      ...emptyTripBalance(),
      totalCents,
      assignments: [{ unitKey: "open", label: "Open balance", amountCents: totalCents }],
      payments:
        paidCents > 0
          ? [
              {
                id: "p1",
                unitKey: "open",
                amountCents: paidCents,
                currency: "USD",
                status: "succeeded" as const,
                stripePaymentIntentId: "pi_test",
                receiptNumber: "1001",
                createdAt: "2026-01-01T00:00:00Z",
              },
            ]
          : [],
    };
  }

  it("is due once something is actually owed within the window, before departure", () => {
    assert.equal(balanceDueReminderDue(trip({ startDate: "2026-06-20", balance: withBalance(50000) }), TODAY), true);
    // 30 days out — outside the window
    assert.equal(balanceDueReminderDue(trip({ startDate: "2026-07-10", balance: withBalance(50000) }), TODAY), false);
    // already departed
    assert.equal(balanceDueReminderDue(trip({ startDate: "2026-06-01", balance: withBalance(50000) }), TODAY), false);
  });

  it("never fires once the balance is fully paid off", () => {
    assert.equal(balanceDueReminderDue(trip({ startDate: "2026-06-20", balance: withBalance(50000, 50000) }), TODAY), false);
  });

  it("never fires on a trip with no balance set up at all", () => {
    assert.equal(balanceDueReminderDue(trip({ startDate: "2026-06-20", balance: undefined }), TODAY), false);
  });

  it("fires once — never again once it has already gone out", () => {
    assert.equal(
      balanceDueReminderDue(trip({ startDate: "2026-06-20", balance: withBalance(50000), remindersSent: { balanceDue: "2026-06-05" } }), TODAY),
      false,
    );
  });

  it("names the amount actually owed", () => {
    const text = balanceDueReminderText(trip({ balance: withBalance(50000) }));
    assert.match(text, /\$500\.00/);
  });
});

describe("automatic reminders stay behind the same fences as the rest of the client tools", () => {
  const TRIPS_ROUTE = readFileSync("app/api/account/trips/route.ts", "utf8");
  const CRON_ROUTE = readFileSync("app/api/cron/trip-reminders/route.ts", "utf8");

  it("turning them on or off is gated the same as naming a client at all", () => {
    const branch = TRIPS_ROUTE.slice(TRIPS_ROUTE.indexOf('case "auto-reminders"'), TRIPS_ROUTE.indexOf('case "commission"'));
    assert.match(branch, /mayServeCompanionClients/);
  });

  it("the cron route refuses to run without its own secret, fails closed if unset, and checks the header", () => {
    assert.match(CRON_ROUTE, /process\.env\.CRON_SECRET/);
    assert.match(CRON_ROUTE, /Not configured/);
    assert.match(CRON_ROUTE, /authorization.*!==.*Bearer \$\{secret\}/);
  });

  it("re-checks the plan fresh per account, not just the scan's own snapshot", () => {
    assert.match(CRON_ROUTE, /mayServeCompanionClients\(await getPlan\(account\.email\)\)/);
  });

  it("never marks a reminder sent without confirming the message actually saved", () => {
    // These are one-shot — remindersSent means "never fire this again". A
    // mark written after a chat-store write that silently failed (the store
    // is down, the network blips) would mean the client never sees the
    // message AND it never retries, forever. appendChat itself no-ops and
    // returns [] on failure rather than throwing, so the return value has to
    // be checked, not just awaited.
    //
    // Both sends now go through one `deliver`, so the check is written once
    // and cannot drift apart between the two kinds — but it still has to be
    // the early return, not something after the mark.
    assert.match(CRON_ROUTE, /function wasDelivered/);
    assert.match(CRON_ROUTE, /if \(!\(await wasDelivered\(shareId, message\)\)\) \{[^]*?return;/);
    assert.equal(CRON_ROUTE.match(/await deliver\(/g)?.length, 2, "departure and balance-due should both go through deliver");
  });

  it("stores and marks the reminder BEFORE pushing it, never the other way round", () => {
    // The order is the whole safety property. A push is best-effort — a phone
    // that is off, a subscription the browser dropped, a push service having
    // a bad minute. If the mark waited on the push, a client whose phone was
    // off would never be reminded at all; as written, the reminder is already
    // in the thread waiting for them and the push is only how they find out
    // today rather than the next time they open the app.
    const body = CRON_ROUTE.slice(CRON_ROUTE.indexOf("const deliver ="), CRON_ROUTE.indexOf("if (departureReminderDue"));
    const mark = body.indexOf("markReminderSent");
    const push = body.indexOf("pushToTripSubscribers");
    assert.ok(mark > 0 && push > 0, "deliver should both mark and push");
    assert.ok(mark < push, "the reminder must be marked sent before it is pushed, so a failed push cannot lose it");
  });

  it("pushes to the trip's own subscribed devices, and cannot fail the run", () => {
    assert.match(CRON_ROUTE, /pushToTripSubscribers\(account\.email, trip\.id, push\)/);
    // pushToTripSubscribers swallows its own errors and returns a count, so
    // the cron does not need a catch here — but it must be the function that
    // does, not this route re-implementing the send.
    const STORE = readFileSync("lib/account-store.ts", "utf8");
    const fn = STORE.slice(STORE.indexOf("export async function pushToTripSubscribers"), STORE.indexOf("/** One push, summarizing"));
    assert.match(fn, /try \{/);
    assert.match(fn, /catch \(error\) \{[^]*?return 0;/);
  });

  it("forgets a device the push service says is gone", () => {
    // A browser that cleared its data or an uninstalled app leaves a dead
    // endpoint. Kept forever, every future push retries it; pruned on the
    // 404/410 the service actually returns, the list stays real.
    const STORE = readFileSync("lib/account-store.ts", "utf8");
    const fn = STORE.slice(STORE.indexOf("export async function pushToTripSubscribers"), STORE.indexOf("/** One push, summarizing"));
    assert.match(fn, /expired/);
    assert.match(fn, /filter\(\(s\) => !expired\.includes\(s\.endpoint\)\)/);
  });
});

describe("what a reminder says on a lock screen", () => {
  // A chat message is read by somebody who opened their trip. A notification
  // is read by whoever is standing behind them in a queue. These two say less
  // than their thread counterparts on purpose, and that is worth pinning:
  // the easy mistake later is "why are there two of these" followed by a
  // tidy-up that pushes the chat text.
  // Outstanding is read off the assignments, not totalCents — see
  // outstandingCents in data/trip-payments.ts.
  const withClient = trip({
    client: "Chaya",
    balance: {
      ...emptyTripBalance(),
      totalCents: 400_000,
      assignments: [{ unitKey: "open", label: "Open balance", amountCents: 400_000 }],
    },
  });

  it("never puts the client's name in the notification", () => {
    assert.ok(departureReminderText(withClient).includes("Chaya"), "the thread message does greet them by name");
    assert.ok(!departureReminderPush(withClient).title.includes("Chaya"));
    assert.ok(!departureReminderPush(withClient).body.includes("Chaya"));
    assert.ok(!balanceDueReminderPush(withClient).title.includes("Chaya"));
    assert.ok(!balanceDueReminderPush(withClient).body.includes("Chaya"));
  });

  it("never puts the amount owed in the notification", () => {
    const push = balanceDueReminderPush(withClient);
    assert.match(balanceDueReminderText(withClient), /4,000|4000/, "the thread message does carry the figure");
    assert.doesNotMatch(`${push.title} ${push.body}`, /\d[\d,.]*\s*(USD|\$)|[$£€]\s*\d/);
    // It still has to say what it is about, or it is not worth sending.
    assert.match(push.title, /balance/i);
  });

  it("still says enough to be worth waking a phone for", () => {
    const push = departureReminderPush(withClient);
    assert.match(push.title, new RegExp(`${DEPARTURE_REMINDER_DAYS} days`));
    assert.ok(push.body.includes("Poland trip"), "the trip should be named, so somebody with two knows which");
    assert.ok(push.body.includes("2026-06-13"), "a departure reminder that will not say when is not worth sending");
  });
});

describe("something actually calls the reminders endpoint on a schedule", () => {
  // THE ONE THAT MATTERS. Everything above is about what happens when the
  // endpoint runs. None of it is worth anything if nothing ever calls it —
  // which is exactly what shipped the first time: the schedule went into
  // vercel.json, nothing deploys this repository to Vercel, and the reminders
  // silently never fired. A feature that fails by doing nothing, with no
  // error anywhere, is the kind this test exists to catch.
  const WORKFLOW = readFileSync(".github/workflows/trip-reminders.yml", "utf8");
  const VERCEL = readFileSync("vercel.json", "utf8");

  it("runs on a schedule, not only when somebody presses it", () => {
    assert.match(WORKFLOW, /schedule:/);
    assert.match(WORKFLOW, /- cron: "[^"]+"/);
  });

  it("calls the reminders endpoint, holding the shared secret", () => {
    assert.match(WORKFLOW, /\/api\/cron\/trip-reminders/);
    assert.match(WORKFLOW, /Authorization: Bearer \$CRON_SECRET/);
    assert.match(WORKFLOW, /secrets\.CRON_SECRET/);
  });

  it("FAILS LOUDLY rather than reporting success on a refused run", () => {
    // A green tick on a run that sent nothing would hide the outage it is
    // meant to reveal.
    assert.match(WORKFLOW, /if \[ "\$code" != "200" \]/);
    assert.match(WORKFLOW, /exit 1/);
  });

  it("keeps the inert vercel.json schedule from coming back", () => {
    // Vercel cron entries do nothing here; one sitting in this file reads as
    // a working schedule to the next person who looks.
    assert.doesNotMatch(VERCEL, /"crons"/);
  });
});
