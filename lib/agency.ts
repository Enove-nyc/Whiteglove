/**
 * An Agency: several advisor logins, sharing one Advisor Pro subscription.
 *
 * EVERY MEMBER IS A REAL, SEPARATE LOGIN. Joining an agency is not a seat
 * count on somebody else's account — it sets `plan: "pro"` on the member's
 * OWN account record, the exact same way an admin grant or a Stripe checkout
 * does (see setPlan in lib/account-plan-store.ts). Nothing in
 * lib/account-limits.ts had to change for Agency to exist: an agency member
 * simply is a Pro account, like any other, and every entitlement gate keeps
 * reading the one field it always has.
 *
 * WHAT AN AGENCY ACTUALLY ADDS, THEN, IS TWO THINGS: a shared identity — the
 * letterhead in lib/business-brand-store.ts resolves to the agency's own
 * record instead of each member's, so a client sees one consistent business
 * across every advisor — and shared billing: the owner's Stripe subscription
 * pays $25/month per seat beyond their own, and this file's rules say how
 * many seats that buys and who may fill them.
 *
 * THE OWNER IS THE ONE WHOSE CARD IS ON FILE. Only the owner may invite, buy
 * or release seats, or remove a member — see removeMemberProblem below. A
 * member may always leave on their own; nobody is kept somewhere by a
 * subscription they do not hold.
 *
 * ONE TRIP NEVER HAS AN AGENCY. It is a single fee for a single trip, not a
 * subscription — there is nothing here to attach a seat to.
 */

import { identityKey } from "@/lib/identity";

export type AgencyMemberRole = "owner" | "advisor";

export type AgencyMember = {
  /** The member's own sign-in identity — an email or a phone. */
  account: string;
  role: AgencyMemberRole;
  joinedAt: string;
};

export type AgencyRecord = {
  id: string;
  /** The identity whose Stripe subscription this is. Always also a member. */
  owner: string;
  /** Includes the owner. One entry per real login. */
  members: AgencyMember[];
  /**
   * Total logins this agency may have RIGHT NOW, including the owner's own
   * founding seat. seatsPurchased - 1 is what is actually billed, at $25 a
   * seat — the founding seat comes with Advisor Pro itself.
   */
  seatsPurchased: number;
  createdAt: string;
  updatedAt: string;
};

export type AgencyInvite = {
  /** Unique and unguessable — the id the join link carries. */
  token: string;
  agencyId: string;
  /** Who was asked. Email only — see inviteProblem. */
  email: string;
  invitedAt: string;
  /** The owner's identity, for "who invited you" on the accept screen. */
  invitedBy: string;
  expiresAt: string;
};

/** How long an unaccepted invite holds its seat before it can be sent again. */
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * A ceiling on seats, not a promise about them. Nothing about the product
 * needs one; this is here so a typo — buying 500 seats by mistake — fails
 * with a sentence instead of a very large Stripe invoice.
 */
export const MAX_SEATS = 25;

export function seatsUsed(agency: AgencyRecord): number {
  return agency.members.length;
}

/**
 * How many seats are free to invite into RIGHT NOW.
 *
 * `pendingInvites` is passed in rather than read here because an invite is
 * its own record (lib/agency-store.ts) — an open invite holds its seat the
 * same as a member does, so two invites cannot both be accepted into one
 * seat that was only ever paid for once.
 */
export function seatsAvailable(agency: AgencyRecord, pendingInvites: number): number {
  return Math.max(0, agency.seatsPurchased - seatsUsed(agency) - pendingInvites);
}

/** Seats beyond the founding advisor's own — what is actually billed, at $25 each. */
export function extraSeats(seatsPurchased: number): number {
  return Math.max(0, seatsPurchased - 1);
}

function sameAccount(a: string, b: string): boolean {
  return identityKey(a) === identityKey(b);
}

export function isMember(agency: AgencyRecord, account: string): boolean {
  return agency.members.some((m) => sameAccount(m.account, account));
}

export function isOwner(agency: AgencyRecord, account: string): boolean {
  return sameAccount(agency.owner, account);
}

export function memberRole(agency: AgencyRecord, account: string): AgencyMemberRole | null {
  return agency.members.find((m) => sameAccount(m.account, account))?.role ?? null;
}

/**
 * Why this invite cannot be sent, or null.
 *
 * EMAIL ONLY. The invite is a link somebody has to receive to accept, and a
 * phone number on this site has no inbox for that — see lib/identity.ts.
 * `alreadyElsewhere` is whether the invited identity already belongs to a
 * DIFFERENT agency — checked by the caller against lib/agency-store.ts,
 * since this file knows nothing about storage. One agency per advisor: a
 * second invite would either silently fail to mean anything or silently
 * move them, and neither is a thing to do without them noticing.
 */
export function inviteProblem(input: {
  agency: AgencyRecord;
  email: string;
  pendingInvites: number;
  alreadyElsewhere: boolean;
}): string | null {
  const identity = input.email.trim();
  if (!identity.includes("@")) return "Invite by email — there is no inbox for the link to land in otherwise.";
  if (isMember(input.agency, identity)) return "That person is already on this agency.";
  if (input.alreadyElsewhere) return "That person already belongs to a different agency.";
  if (seatsAvailable(input.agency, input.pendingInvites) <= 0) {
    return "Every seat is filled or already invited. Buy another seat first, or free one up.";
  }
  return null;
}

/**
 * Why the seat count cannot be set to `nextSeats`, or null.
 *
 * `agency` is null for someone on Advisor Pro who has never bought a seat —
 * buying the first one is what creates the agency, so there is nothing to
 * read yet and the floor is simply themself.
 */
export function seatChangeProblem(agency: AgencyRecord | null, nextSeats: number, pendingInvites: number): string | null {
  if (!Number.isFinite(nextSeats) || !Number.isInteger(nextSeats) || nextSeats < 1) {
    return "An agency needs at least one seat — your own.";
  }
  if (nextSeats > MAX_SEATS) return `${MAX_SEATS} seats is the most one agency can hold here — write in for more.`;
  const committed = (agency ? seatsUsed(agency) : 1) + pendingInvites;
  if (nextSeats < committed) {
    return `${committed} seats are filled or invited already. Remove somebody, or let an invite expire, before going lower.`;
  }
  return null;
}

/**
 * Why this member cannot be removed, or null.
 *
 * The owner can never be removed through this door — their seat is the one
 * the subscription is actually on. Ending the whole agency (cancelling down
 * to one seat, or cancelling Advisor Pro itself) is a different action, done
 * through the same billing portal every subscription uses.
 */
export function removeMemberProblem(agency: AgencyRecord, account: string): string | null {
  if (isOwner(agency, account)) return "The owner cannot be removed this way — reduce seats or cancel Advisor Pro instead.";
  if (!isMember(agency, account)) return "That person is not on this agency.";
  return null;
}

/** "3 of 5 seats filled" — what an owner reads before inviting or buying more. */
export function describeSeats(agency: AgencyRecord, pendingInvites: number): string {
  const used = seatsUsed(agency);
  const held = used + pendingInvites;
  const parts =
    pendingInvites > 0
      ? `${used} of ${agency.seatsPurchased} seats filled, ${pendingInvites} more invited`
      : `${used} of ${agency.seatsPurchased} seats filled`;
  return held >= agency.seatsPurchased ? `${parts} — none free right now.` : `${parts}.`;
}
