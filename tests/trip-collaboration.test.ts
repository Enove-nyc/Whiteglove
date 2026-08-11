import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  applyVote,
  assignTravelerRoom,
  favoriteProblem,
  roomLabelProblem,
  tallyVotes,
  unassignedTravelers,
  voteProblem,
  type TripVote,
} from "@/lib/trip-collaboration";

describe("votes", () => {
  it("rejects incomplete votes", () => {
    assert.ok(voteProblem({}));
    assert.equal(voteProblem({ targetId: "h1", label: "Hotel", kind: "hotel", value: 1 }), null);
  });

  it("replaces the same person's prior vote on a target", () => {
    const first: TripVote = {
      id: "1",
      targetId: "h1",
      kind: "hotel",
      label: "Hotel",
      voter: "a@b.co",
      value: 1,
      createdAt: "2026-01-01",
    };
    const second: TripVote = { ...first, id: "2", value: -1 };
    const next = applyVote([first], second);
    assert.equal(next.length, 1);
    assert.equal(next[0].value, -1);
    assert.deepEqual(tallyVotes(next, "h1"), { up: 0, down: 1, score: -1 });
  });
});

describe("shared favorites", () => {
  it("needs a label and kind", () => {
    assert.ok(favoriteProblem({ label: "", kind: "place" }));
    assert.equal(favoriteProblem({ label: "Bakery", kind: "place" }), null);
  });
});

describe("rooms", () => {
  it("moves a traveler between rooms without inventing assignments", () => {
    const rooms = assignTravelerRoom(
      [{ id: "r1", label: "Room 1", travelerIds: ["a"] }],
      "b",
      "r1",
    );
    assert.deepEqual(rooms[0].travelerIds, ["a", "b"]);
    const cleared = assignTravelerRoom(rooms, "a", null);
    assert.deepEqual(cleared[0].travelerIds, ["b"]);
    assert.deepEqual(
      unassignedTravelers(
        [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ],
        cleared,
      ).map((t) => t.id),
      ["a"],
    );
  });

  it("rejects empty room names", () => {
    assert.ok(roomLabelProblem("  "));
    assert.equal(roomLabelProblem("Parents"), null);
  });

  it("keeps room grouping on the itinerary the planner already holds", () => {
    const panel = readFileSync("components/RoomGroupsPanel.tsx", "utf8");
    assert.match(panel, /itinerary/);
    assert.match(panel, /onChange/);
    assert.doesNotMatch(panel, /import \{[^}]*useSyncExternalStore/);
    assert.doesNotMatch(panel, /localStorage/);
  });
});
