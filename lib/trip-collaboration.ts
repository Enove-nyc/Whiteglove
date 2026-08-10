/**
 * Group planning helpers that sit beside comments and roles.
 *
 * Votes, shared favorites and room groupings are stored separately from the
 * itinerary JSON (see trip-votes-store / trip-favorites-store) so two people
 * editing at once do not overwrite each other's clicks — the same reason
 * comments have their own key.
 *
 * Room assignment lives on the traveler list because it is part of who is
 * going, not a side conversation about the plan.
 */

import type { ItinTraveler, Itinerary } from "@/data/itinerary";

export const VOTE_KINDS = ["hotel", "restaurant", "activity"] as const;
export type VoteKind = (typeof VOTE_KINDS)[number];

export type TripVote = {
  id: string;
  /** Stable id of the lodging, activity or free-text option being voted on. */
  targetId: string;
  kind: VoteKind;
  /** Display name at vote time — the target may be renamed later. */
  label: string;
  voter: string;
  voterName?: string;
  /** 1 = up, -1 = down. One vote per person per target. */
  value: 1 | -1;
  createdAt: string;
};

export type SharedFavorite = {
  id: string;
  label: string;
  href?: string;
  kind: VoteKind | "place" | "other";
  addedBy: string;
  addedByName?: string;
  createdAt: string;
};

export type TripRoom = {
  id: string;
  /** "Room 1", "Parents", etc. */
  label: string;
  travelerIds: string[];
};

export function isVoteKind(value: unknown): value is VoteKind {
  return typeof value === "string" && (VOTE_KINDS as readonly string[]).includes(value);
}

export function voteProblem(input: { targetId?: string; label?: string; kind?: unknown; value?: unknown }): string | null {
  if (!input.targetId?.trim()) return "Say what this vote is about.";
  if (!input.label?.trim()) return "Name what you are voting on.";
  if (!isVoteKind(input.kind)) return "Choose hotel, restaurant or activity.";
  if (input.value !== 1 && input.value !== -1) return "A vote is for or against.";
  return null;
}

export function favoriteProblem(input: { label?: string; kind?: unknown }): string | null {
  if (!input.label?.trim()) return "Name the place.";
  const kind = input.kind;
  if (kind !== "hotel" && kind !== "restaurant" && kind !== "activity" && kind !== "place" && kind !== "other") {
    return "Choose what kind of place this is.";
  }
  return null;
}

/** One person's vote replaces their previous vote on the same target. */
export function applyVote(votes: TripVote[], next: TripVote): TripVote[] {
  const rest = votes.filter((v) => !(v.targetId === next.targetId && v.voter === next.voter));
  return [...rest, next];
}

export function tallyVotes(votes: TripVote[], targetId: string): { up: number; down: number; score: number } {
  let up = 0;
  let down = 0;
  for (const vote of votes) {
    if (vote.targetId !== targetId) continue;
    if (vote.value === 1) up += 1;
    else down += 1;
  }
  return { up, down, score: up - down };
}

export function roomsOf(itin: Itinerary): TripRoom[] {
  const stored = (itin as Itinerary & { rooms?: TripRoom[] }).rooms;
  return Array.isArray(stored) ? stored.filter((r) => r && typeof r.id === "string") : [];
}

/**
 * Assign travelers to rooms. Unassigned travelers stay unassigned — never
 * silently dumped into room 1.
 */
export function assignTravelerRoom(
  rooms: TripRoom[],
  travelerId: string,
  roomId: string | null,
): TripRoom[] {
  const cleaned = rooms.map((room) => ({
    ...room,
    travelerIds: room.travelerIds.filter((id) => id !== travelerId),
  }));
  if (!roomId) return cleaned.filter((room) => room.travelerIds.length > 0 || room.label.trim());
  return cleaned.map((room) =>
    room.id === roomId ? { ...room, travelerIds: [...room.travelerIds, travelerId] } : room,
  );
}

export function roomLabelProblem(label: string): string | null {
  if (!label.trim()) return "Name the room.";
  if (label.trim().length > 40) return "Keep the room name under 40 characters.";
  return null;
}

/** Travelers who are not on any room list. */
export function unassignedTravelers(travelers: ItinTraveler[], rooms: TripRoom[]): ItinTraveler[] {
  const assigned = new Set(rooms.flatMap((room) => room.travelerIds));
  return travelers.filter((t) => !assigned.has(t.id));
}
