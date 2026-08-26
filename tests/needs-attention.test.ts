import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { tripReminders } from "@/data/trip-reminders";
import { REMINDER_ACTION, actionForReminder } from "@/lib/needs-attention";

/**
 * Everything that needs a planner's attention gets one thing to press.
 *
 * WHAT IT WAS. The pipeline flagged six kinds of thing and offered an action
 * for one of them. The other five read "⚑ 2 add-ons still waiting on an
 * answer" — true, agreed, and then the planner had to work out for themselves
 * which screen answers an add-on. A work queue that names work and does not
 * lead to it is a list of reasons to feel behind.
 */

describe("every reason a trip needs attention leads somewhere", () => {
  it("covers every reason the pipeline can produce", () => {
    // The Record type makes this a compile error too. Asserted at runtime as
    // well because a reason added with a hand-written cast would slip past.
    const reasons = Object.keys(REMINDER_ACTION);
    assert.ok(reasons.length >= 6, `only ${reasons.length} reasons have an action`);
    for (const reason of reasons) {
      const action = actionForReminder(reason as keyof typeof REMINDER_ACTION);
      assert.ok(action, `${reason} has no action`);
      assert.ok(action.label.trim().length > 0, `${reason}'s action has no label`);
    }
  });

  it("gives each one exactly one action, not a menu", () => {
    // The point of the whole thing. If this ever becomes a list, the queue has
    // turned back into navigation.
    for (const action of Object.values(REMINDER_ACTION)) {
      assert.ok(!Array.isArray(action), "an action became a list of actions");
      assert.equal(typeof action.label, "string");
    }
  });

  it("only sends a planner somewhere the trip row can already open", () => {
    // Anywhere else would mean inventing a route. These three are the buttons
    // the card already carries, and they already resolve to the right trip.
    const openable = new Set(["/itinerary", "/proposal", "/payments"]);
    for (const [reason, action] of Object.entries(REMINDER_ACTION)) {
      if (action.kind !== "open") continue;
      assert.ok(openable.has(action.path), `${reason} points at ${action.path}, which the row cannot open`);
    }
  });

  it("keeps the rating request inline, because leaving would lose the point", () => {
    const action = actionForReminder("trip_completed_no_rating_sent");
    assert.equal(action.kind, "inline");
  });

  it("tells the planner the client said yes, and what to do about it", () => {
    // The worse of the two silences: tripStage moves an approved trip straight
    // to "Confirmed", so the board reads as settled while the agreed option is
    // still not on the itinerary — and the itinerary is what the traveler
    // opens. Nothing on the pipeline said so.
    const action = actionForReminder("proposal_approved_not_converted");
    assert.equal(action.kind, "open");
    if (action.kind === "open") {
      assert.equal(action.path, "/proposal");
      assert.match(action.label, /convert/i);
    }
  });

  it("gives the changes-requested badge something to press", () => {
    const action = actionForReminder("proposal_changes_requested");
    assert.equal(action.kind, "open");
    if (action.kind === "open") assert.equal(action.path, "/proposal");
  });

  it("sends the add-on chase to the proposal, where add-ons are answered", () => {
    const action = actionForReminder("addon_pending");
    assert.equal(action.kind, "open");
    if (action.kind === "open") assert.equal(action.path, "/proposal");
  });
});

describe("the reasons and their actions cannot drift apart", () => {
  it("every reason tripReminders can emit has an action", () => {
    // Driven from the real function rather than a list copied beside it: a
    // reason added there and forgotten here is what this catches.
    const today = "2026-08-26";
    // Each shape below is chosen to make a different reason fire; together
    // they cover every branch tripReminders has.
    let seen = 0;

    for (const trip of [
      { stage: "proposal" as const, proposal: { status: "sent", sentAt: "2026-08-01T00:00:00Z" } as never },
      { stage: "proposal" as const, proposal: { status: "viewed", sentAt: "2026-08-25T00:00:00Z", expiresAt: "2026-08-27" } as never },
      { stage: "planning" as const, startDate: "2026-09-01" },
      { stage: "completed" as const, endDate: "2026-08-20" },
      // The client has acted, and until now neither said so on the pipeline.
      { stage: "confirmed" as const, proposal: { status: "approved", options: [{ id: "a" }] } as never },
      { stage: "awaiting_approval" as const, proposal: { status: "changes_requested", options: [{ id: "a" }] } as never },
    ]) {
      for (const reminder of tripReminders(trip, today)) {
        seen += 1;
        assert.ok(
          reminder.reason in REMINDER_ACTION,
          `tripReminders emits "${reminder.reason}", which has no action`,
        );
      }
    }

    // Without this the loop above passes by emitting nothing at all, which is
    // the failure mode of every test that walks a generated list.
    assert.ok(seen >= 3, `only ${seen} reminders fired — the fixtures stopped exercising the branches`);
  });

  it("the pipeline renders the action rather than special-casing one reason", () => {
    const source = readFileSync("components/PipelineDashboard.tsx", "utf8");
    assert.ok(source.includes("actionForReminder(r.reason)"), "the dashboard no longer asks for the action");
    // The old shape: one reason got a control, the rest got nothing.
    assert.ok(
      !source.includes('r.reason === "trip_completed_no_rating_sent" && <RatingRequestAction'),
      "one reason is special-cased again and the other five have nothing to press",
    );
  });
});

/**
 * The two client actions the pipeline used to swallow.
 *
 * Driven through tripReminders itself, because the point is not that the
 * action table has an entry — it is that the reminder fires at all.
 */
describe("a client acting on a proposal reaches the planner", () => {
  const today = "2026-08-26";
  const options = [{ id: "a", name: "Option A", components: [] }];

  it("fires when they approved and nobody has converted it", () => {
    const reasons = tripReminders(
      { stage: "confirmed", proposal: { id: "p", status: "approved", options, comments: [], createdAt: today, updatedAt: today } },
      today,
    ).map((r) => r.reason);
    assert.ok(reasons.includes("proposal_approved_not_converted"), `got ${JSON.stringify(reasons)}`);
  });

  it("stops once it has been converted", () => {
    // convertProposalToItinerary moves the proposal to "confirmed". The
    // reminder must go with it, or it nags for ever after the work is done.
    const reasons = tripReminders(
      { stage: "confirmed", proposal: { id: "p", status: "confirmed", options, comments: [], createdAt: today, updatedAt: today } },
      today,
    ).map((r) => r.reason);
    assert.ok(!reasons.includes("proposal_approved_not_converted"));
  });

  it("fires when they asked for changes", () => {
    const reasons = tripReminders(
      { stage: "awaiting_approval", proposal: { id: "p", status: "changes_requested", options, comments: [], createdAt: today, updatedAt: today } },
      today,
    ).map((r) => r.reason);
    assert.ok(reasons.includes("proposal_changes_requested"), `got ${JSON.stringify(reasons)}`);
  });

  it("says nothing while it is still with the client", () => {
    for (const status of ["draft", "sent", "viewed"] as const) {
      const reasons = tripReminders(
        { stage: "awaiting_approval", proposal: { id: "p", status, options, comments: [], createdAt: today, updatedAt: today } },
        today,
      ).map((r) => r.reason);
      assert.ok(!reasons.includes("proposal_approved_not_converted"), `${status} nagged about converting`);
      assert.ok(!reasons.includes("proposal_changes_requested"), `${status} nagged about changes`);
    }
  });
});
