import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tripReminders } from "@/data/trip-reminders";
import { emptyProposal } from "@/data/proposal";
import { emptyTripBalance } from "@/data/trip-payments";
import { emptyAddonItem } from "@/data/trip-addons";

const TODAY = "2026-06-01";

describe("a stale, unanswered proposal", () => {
  it("is quiet the day it's sent", () => {
    const proposal = { ...emptyProposal(), status: "sent" as const, sentAt: `${TODAY}T00:00:00Z` };
    assert.deepEqual(tripReminders({ stage: "awaiting_approval", proposal }, TODAY), []);
  });

  it("flags a follow-up once it's gone unanswered for a few days", () => {
    const proposal = { ...emptyProposal(), status: "viewed" as const, sentAt: "2026-05-27T00:00:00Z" };
    const out = tripReminders({ stage: "awaiting_approval", proposal }, TODAY);
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "proposal_stale");
  });

  it("stops chasing once the client has answered", () => {
    // This used to assert NOTHING at all fires on an approved proposal, which
    // read as "the client answered, so there is nothing left to do". There is:
    // tripStage moves an approved trip straight to Confirmed while the agreed
    // option has never been copied onto the itinerary, and the itinerary is
    // what the traveler opens. So the follow-up chase stops — which is what
    // this test was really protecting — and the convert prompt takes its place.
    const proposal = { ...emptyProposal(), status: "approved" as const, sentAt: "2026-05-01T00:00:00Z" };
    const out = tripReminders({ stage: "confirmed", proposal }, TODAY);
    assert.ok(!out.some((r) => r.reason === "proposal_stale"), "still chasing a proposal the client answered");
    assert.ok(!out.some((r) => r.reason === "proposal_expiring"));
    assert.deepEqual(out.map((r) => r.reason), ["proposal_approved_not_converted"]);
  });

  it("goes quiet for real once the agreed option is on the itinerary", () => {
    // convertProposalToItinerary moves the proposal to "confirmed".
    const proposal = { ...emptyProposal(), status: "confirmed" as const, sentAt: "2026-05-01T00:00:00Z" };
    assert.deepEqual(tripReminders({ stage: "confirmed", proposal }, TODAY), []);
  });
});

describe("a proposal about to expire", () => {
  it("flags one expiring within a couple of days", () => {
    const proposal = { ...emptyProposal(), status: "sent" as const, sentAt: `${TODAY}T00:00:00Z`, expiresAt: "2026-06-02" };
    const out = tripReminders({ stage: "awaiting_approval", proposal }, TODAY);
    assert.ok(out.some((r) => r.reason === "proposal_expiring"));
  });

  it("stays quiet for one expiring well in the future", () => {
    const proposal = { ...emptyProposal(), status: "sent" as const, sentAt: `${TODAY}T00:00:00Z`, expiresAt: "2026-07-01" };
    const out = tripReminders({ stage: "awaiting_approval", proposal }, TODAY);
    assert.ok(!out.some((r) => r.reason === "proposal_expiring"));
  });
});

describe("a payment due soon", () => {
  it("flags a schedule line due within a week, while something is still owed", () => {
    const balance = {
      ...emptyTripBalance(),
      totalCents: 10000,
      assignments: [{ unitKey: "open", label: "Open balance", amountCents: 10000 }],
      schedule: [{ id: "s1", label: "Deposit", amountCents: 10000, dueDate: "2026-06-03" }],
    };
    const out = tripReminders({ stage: "confirmed", balance }, TODAY);
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "payment_due_soon");
  });

  it("stays quiet once the balance is fully paid off", () => {
    const balance = {
      ...emptyTripBalance(),
      totalCents: 10000,
      assignments: [{ unitKey: "open", label: "Open balance", amountCents: 10000 }],
      schedule: [{ id: "s1", label: "Deposit", amountCents: 10000, dueDate: "2026-06-03" }],
      payments: [{ id: "p1", unitKey: "open", amountCents: 10000, currency: "USD", status: "succeeded" as const, stripePaymentIntentId: "pi_1", receiptNumber: "1", createdAt: TODAY }],
    };
    assert.deepEqual(tripReminders({ stage: "confirmed", balance }, TODAY), []);
  });
});

describe("add-ons still waiting on an answer", () => {
  it("flags them once they've sat unanswered a few days", () => {
    const addons = [{ ...emptyAddonItem(), id: "a1", createdAt: "2026-05-25T00:00:00Z" }];
    const out = tripReminders({ stage: "confirmed", addons }, TODAY);
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "addon_pending");
  });

  it("stays quiet for a fresh offer", () => {
    const addons = [{ ...emptyAddonItem(), id: "a1", createdAt: `${TODAY}T00:00:00Z` }];
    assert.deepEqual(tripReminders({ stage: "confirmed", addons }, TODAY), []);
  });
});

describe("a trip starting soon with nothing confirmed", () => {
  it("flags one starting within two weeks while still in planning", () => {
    const out = tripReminders({ stage: "planning", startDate: "2026-06-10" }, TODAY);
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "trip_soon_unconfirmed");
  });

  it("stays quiet once the trip is confirmed", () => {
    assert.deepEqual(tripReminders({ stage: "confirmed", startDate: "2026-06-10" }, TODAY), []);
  });

  it("stays quiet for a trip far in the future", () => {
    assert.deepEqual(tripReminders({ stage: "planning", startDate: "2026-12-01" }, TODAY), []);
  });
});

describe("a completed trip with no rating request sent", () => {
  it("flags it once the trip has ended", () => {
    const out = tripReminders({ stage: "completed", endDate: "2026-05-20" }, TODAY);
    assert.equal(out.length, 1);
    assert.equal(out[0].reason, "trip_completed_no_rating_sent");
  });

  it("stays quiet once a request has already been sent", () => {
    assert.deepEqual(tripReminders({ stage: "completed", endDate: "2026-05-20", ratingRequestSentAt: "2026-05-21T00:00:00Z" }, TODAY), []);
  });

  it("stays quiet for a trip that ended too long ago to bother nudging", () => {
    assert.deepEqual(tripReminders({ stage: "completed", endDate: "2025-01-01" }, TODAY), []);
  });

  it("stays quiet for a trip that isn't over yet", () => {
    assert.deepEqual(tripReminders({ stage: "traveling", endDate: "2026-06-05" }, TODAY), []);
  });
});
