/**
 * Owner switches for growth features that must stay off until approved.
 *
 * Referral and membership stay disabled by default. Collaboration tools default
 * on because they are free self-service on trips people already share — the
 * admin can still turn a piece off without a deploy.
 */

import type { TravelProduct } from "@/lib/affiliate/partners";

export type CollaborationSettings = {
  votingEnabled: boolean;
  sharedFavoritesEnabled: boolean;
  roomGroupsEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_COLLABORATION_SETTINGS: CollaborationSettings = {
  votingEnabled: true,
  sharedFavoritesEnabled: true,
  roomGroupsEnabled: true,
};

/** Destination-page booking blocks the owner can hide without pausing /book. */
export type DestinationPlacementSettings = {
  /** Products shown in the destination "Book the practical pieces" section. */
  enabledProducts: TravelProduct[];
  /** Master switch for that whole section. */
  sectionEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_DESTINATION_PLACEMENTS: DestinationPlacementSettings = {
  sectionEnabled: true,
  enabledProducts: ["hotel", "flight", "car"],
};

export type MembershipFoundationSettings = {
  /**
   * planned = documented, not sold.
   * disabled = deliberately not offered (same public effect).
   * Never "live" until the owner approves a real launch.
   */
  status: "planned" | "disabled";
  /** Internal notes for the owner — never shown publicly. */
  internalNotes: string;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_MEMBERSHIP_SETTINGS: MembershipFoundationSettings = {
  status: "planned",
  internalNotes: "",
};

export function membershipPublicLabel(settings: MembershipFoundationSettings): string {
  return settings.status === "disabled"
    ? "Not offered — kept off on purpose"
    : "Planned only — not launched, not priced, not sold";
}
