import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EditSuggestion } from "@/lib/admin-content";
import { applyReview, countByStatus, replyDraft, reviewProblem, sortForReview, suggestionSection, waitingFor } from "@/lib/suggestions";

function suggestion(over: Partial<EditSuggestion> = {}): EditSuggestion {
  return {
    id: "suggestion-1",
    targetType: "location",
    targetId: "lizhensk",
    title: "Lizhensk",
    name: "A visitor",
    email: "visitor@example.com",
    issue: "The shomer number is out of date.",
    currentInfo: "+48 111 111 111",
    suggestedInfo: "+48 222 222 222",
    source: "Rang it last week",
    status: "pending",
    createdAt: "2026-07-01T09:00:00.000Z",
    ...over,
  };
}

describe("deciding on a suggestion", () => {
  it("lets an approval through without a note", () => {
    assert.equal(reviewProblem({ status: "approved", notes: "" }), null);
  });

  it("will not turn one down without a reason", () => {
    // A rejection nobody can explain is one you cannot answer the sender
    // about, and cannot explain to yourself six months later either.
    assert.ok(reviewProblem({ status: "rejected", notes: "" }));
    assert.equal(reviewProblem({ status: "rejected", notes: "The old number still answers." }), null);
  });

  it("will not ask for more without saying what", () => {
    assert.ok(reviewProblem({ status: "needs-info", notes: "   " }));
    assert.equal(reviewProblem({ status: "needs-info", notes: "Which entrance did you use?" }), null);
  });
});

describe("recording the decision", () => {
  const at = "2026-07-31T12:00:00.000Z";

  it("keeps the visitor's own words when the wording is edited", () => {
    const reviewed = applyReview(suggestion(), { status: "approved", notes: "", acceptedInfo: "+48 222 222 222 (mobile)" }, at);
    assert.equal(reviewed.suggestedInfo, "+48 222 222 222", "what they wrote must survive");
    assert.equal(reviewed.acceptedInfo, "+48 222 222 222 (mobile)");
  });

  it("does not claim an edit that was not made", () => {
    // Storing an unchanged copy would make every approval look edited.
    const reviewed = applyReview(suggestion(), { status: "approved", notes: "", acceptedInfo: "+48 222 222 222" }, at);
    assert.equal(reviewed.acceptedInfo, undefined);
  });

  it("appends to the history rather than replacing it", () => {
    const first = applyReview(suggestion(), { status: "needs-info", notes: "Which entrance?" }, at);
    const second = applyReview(first, { status: "approved", notes: "" }, "2026-08-02T12:00:00.000Z");
    assert.equal(second.history?.length, 2);
    assert.deepEqual(second.history?.map((h) => h.status), ["needs-info", "approved"]);
    assert.equal(second.history?.[0].notes, "Which entrance?", "the earlier answer keeps its reason");
    assert.equal(second.status, "approved", "the latest decision is still the status");
  });

  it("only stores an edited wording on approval", () => {
    const reviewed = applyReview(suggestion(), { status: "rejected", notes: "Still answers.", acceptedInfo: "something else" }, at);
    assert.equal(reviewed.acceptedInfo, undefined);
  });
});

describe("the order to work through them", () => {
  it("puts what is waiting first, oldest first", () => {
    // The person who wrote in first has been waiting longest. Newest-first is
    // what a feed does, and this list is supposed to reach zero.
    const list = [
      suggestion({ id: "new-pending", createdAt: "2026-07-20T09:00:00.000Z" }),
      suggestion({ id: "done", status: "approved", createdAt: "2026-07-02T09:00:00.000Z", reviewedAt: "2026-07-03T09:00:00.000Z" }),
      suggestion({ id: "old-pending", createdAt: "2026-07-01T09:00:00.000Z" }),
    ];
    assert.deepEqual(sortForReview(list).map((s) => s.id), ["old-pending", "new-pending", "done"]);
  });

  it("puts the most recently decided first among the decided", () => {
    const list = [
      suggestion({ id: "older", status: "approved", reviewedAt: "2026-07-03T09:00:00.000Z" }),
      suggestion({ id: "newer", status: "rejected", reviewedAt: "2026-07-09T09:00:00.000Z" }),
    ];
    assert.deepEqual(sortForReview(list).map((s) => s.id), ["newer", "older"]);
  });

  it("counts every answer, including none", () => {
    const counts = countByStatus([suggestion(), suggestion({ status: "approved" }), suggestion({ status: "approved" })]);
    assert.deepEqual(counts, { pending: 1, approved: 2, rejected: 0, "needs-info": 0 });
  });
});

describe("how long it has been sitting there", () => {
  const day = 86_400_000;
  const from = new Date("2026-07-01T09:00:00.000Z").getTime();

  it("says it in words a person reads at a glance", () => {
    assert.equal(waitingFor("2026-07-01T09:00:00.000Z", from), "today");
    assert.equal(waitingFor("2026-07-01T09:00:00.000Z", from + day), "since yesterday");
    assert.equal(waitingFor("2026-07-01T09:00:00.000Z", from + day * 5), "5 days");
    assert.equal(waitingFor("2026-07-01T09:00:00.000Z", from + day * 21), "3 weeks");
    assert.equal(waitingFor("2026-07-01T09:00:00.000Z", from + day * 90), "3 months");
  });

  it("says nothing rather than something wrong about an unreadable date", () => {
    assert.equal(waitingFor("not a date", from), "");
  });
});

describe("where to go and fix it", () => {
  it("names a section for every kind of suggestion", () => {
    for (const type of ["location", "accommodation", "site", "directory", "new"] as const) {
      const section = suggestionSection(type);
      assert.ok(section.href.startsWith("/admin"), `${type} should point into the admin`);
      assert.ok(section.label.length > 0);
    }
  });
});

describe("writing back to the person", () => {
  it("carries the reason that was recorded", () => {
    const reviewed = applyReview(suggestion(), { status: "needs-info", notes: "Which entrance did you use?" }, "2026-07-31T12:00:00.000Z");
    const draft = replyDraft(reviewed);
    assert.ok(draft.body.includes("Which entrance did you use?"));
    assert.ok(draft.href.startsWith("mailto:visitor%40example.com"));
  });

  it("does not thank somebody for a correction that was turned down", () => {
    const reviewed = applyReview(suggestion(), { status: "rejected", notes: "The old number still answers." }, "2026-07-31T12:00:00.000Z");
    const draft = replyDraft(reviewed);
    assert.ok(!draft.body.includes("has been corrected"));
    assert.ok(draft.body.includes("The old number still answers."));
  });
});
