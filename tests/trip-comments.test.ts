import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_COMMENT,
  type TripComment,
  commentProblem,
  commentsFor,
  describeComments,
  inOrder,
  mayDelete,
  mayResolve,
  openCount,
  orphaned,
  whenWritten,
  whoWrote,
} from "@/lib/trip-comments";

/**
 * Notes people leave on a shared trip.
 *
 * The two rules worth protecting: the owner can mark a note DONE but cannot
 * delete it, because a trip's owner removing somebody's question rather than
 * answering it is the one thing that would stop people writing them; and a
 * note whose stop was deleted is kept and shown separately rather than
 * silently disappearing with it.
 */

const NOW = "2026-08-02T14:00:00.000Z";
const agoMinutes = (m: number) => new Date(Date.parse(NOW) - m * 60_000).toISOString();

const comment = (over: Partial<TripComment> = {}): TripComment => ({
  id: "c1",
  author: "friend@example.com",
  body: "The hotel is forty minutes from the shul.",
  createdAt: agoMinutes(30),
  ...over,
});

describe("what can be posted", () => {
  it("takes something somebody wrote", () => {
    assert.equal(commentProblem("Can we not do Uman on the Friday?"), null);
  });

  it("refuses nothing at all", () => {
    assert.equal(commentProblem("   "), "Write something first.");
    assert.equal(commentProblem(""), "Write something first.");
  });

  it("refuses more than it will keep", () => {
    assert.match(String(commentProblem("x".repeat(MAX_COMMENT + 1))), /under 1200/);
    assert.equal(commentProblem("x".repeat(MAX_COMMENT)), null);
  });
});

describe("who may mark one done", () => {
  const owner = "owner@example.com";

  it("lets the owner, because it is his trip", () => {
    assert.equal(mayResolve(comment(), owner, owner), true);
  });

  it("lets whoever wrote it", () => {
    // Changing your mind about your own note needs nobody's permission.
    assert.equal(mayResolve(comment({ author: "friend@example.com" }), "friend@example.com", owner), true);
  });

  it("does not let another collaborator close somebody else's question", () => {
    // Marking a question answered when it has not been is how a thread stops
    // meaning anything.
    assert.equal(mayResolve(comment({ author: "a@example.com" }), "b@example.com", owner), false);
  });

  it("does not care about capitals", () => {
    assert.equal(mayResolve(comment({ author: "A@Example.com" }), " a@example.com ", owner), true);
  });
});

describe("who may delete one", () => {
  it("only the person who wrote it", () => {
    assert.equal(mayDelete(comment({ author: "a@x.com" }), "a@x.com"), true);
    assert.equal(mayDelete(comment({ author: "a@x.com" }), "b@x.com"), false);
  });

  it("NOT the owner", () => {
    // The one that matters. A trip's owner removing somebody's question rather
    // than answering it is what would make people stop writing them. He can
    // mark it done, which says what actually happened.
    assert.equal(mayDelete(comment({ author: "friend@x.com" }), "owner@example.com"), false);
  });
});

describe("where a note belongs", () => {
  const all = [
    comment({ id: "c1", about: "stop-1", createdAt: agoMinutes(50) }),
    comment({ id: "c2", about: "stop-1", createdAt: agoMinutes(10) }),
    comment({ id: "c3", about: "stop-2" }),
    comment({ id: "c4" }),
  ];

  it("puts a note about a stop on that stop", () => {
    assert.deepEqual(commentsFor(all, "stop-1").map((c) => c.id), ["c1", "c2"]);
  });

  it("puts a note about the whole trip on the trip", () => {
    assert.deepEqual(commentsFor(all, undefined).map((c) => c.id), ["c4"]);
  });

  it("reads oldest first, like a conversation", () => {
    assert.deepEqual(inOrder(all).map((c) => c.id), ["c1", "c3", "c4", "c2"]);
  });

  it("keeps a note whose stop has gone, rather than losing it with the stop", () => {
    // Somebody wrote it and the point may still stand. It cannot be shown
    // under an item that is not there, so it is listed on its own.
    const live = new Set(["stop-1"]);
    assert.deepEqual(orphaned(all, live).map((c) => c.id), ["c3"]);
  });
});

describe("what is still outstanding", () => {
  it("counts only the ones nobody has dealt with", () => {
    const all = [comment({ id: "c1" }), comment({ id: "c2", doneAt: agoMinutes(5) }), comment({ id: "c3", about: "s1" })];
    assert.equal(openCount(all), 2);
    assert.equal(openCount(all, "s1"), 1);
  });

  it("says the open number, not the total", () => {
    // A trip with fourteen answered notes and none open needs nobody.
    assert.equal(describeComments([]), "No notes on this trip yet.");
    assert.equal(describeComments([comment({ doneAt: NOW })]), "1 note, all dealt with.");
    assert.equal(describeComments([comment(), comment({ id: "c2" })]), "2 notes still open.");
  });
});

describe("how a note reads", () => {
  it("names the person", () => {
    assert.equal(whoWrote(comment({ authorName: "Yossi" })), "Yossi");
  });

  it("falls back on what is in front of the @, never a guess at a surname", () => {
    assert.equal(whoWrote(comment({ author: "yossi@example.com", authorName: undefined })), "yossi");
    assert.equal(whoWrote(comment({ author: "+15551234567", authorName: undefined })), "+15551234567");
  });

  it("says when, the way a person would", () => {
    assert.equal(whenWritten(comment({ createdAt: agoMinutes(0) }), NOW), "just now");
    assert.equal(whenWritten(comment({ createdAt: agoMinutes(5) }), NOW), "5 minutes ago");
    assert.equal(whenWritten(comment({ createdAt: agoMinutes(120) }), NOW), "2 hours ago");
    assert.equal(whenWritten(comment({ createdAt: agoMinutes(60 * 26) }), NOW), "yesterday");
    assert.equal(whenWritten(comment({ createdAt: agoMinutes(60 * 24 * 3) }), NOW), "3 days ago");
  });

  it("does not pretend to know when it cannot", () => {
    assert.equal(whenWritten(comment({ createdAt: "rubbish" }), NOW), "earlier");
  });
});
