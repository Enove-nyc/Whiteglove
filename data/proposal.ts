// A proposal: what a planner offers before a trip is confirmed, and what a
// client answers. Pure data model + pure transforms — no Node or browser
// APIs, the same discipline data/itinerary.ts keeps, so a test can build one
// by hand and the planner UI, the client view, and the store can all import
// it without pulling in anything they don't need.
//
// A PROPOSAL IS NOT A SECOND ITINERARY. It holds options a client is
// choosing between — each with its own hotels, flights, activities, a
// price — in a shape too loose to be "the trip" yet. Once one option is
// approved, proposalOptionToStops() turns it into the same ItinFlight /
// ItinLodging / ItinActivity rows the itinerary builder already edits, so
// nothing downstream (Wallet, Guide, the app, printing) has to know a
// proposal ever existed.

import {
  type Itinerary,
  type ItinActivity,
  type ItinFlight,
  type ItinLodging,
} from "@/data/itinerary";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "changes_requested"
  | "approved"
  | "confirmed";

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  changes_requested: "Changes requested",
  approved: "Approved",
  confirmed: "Confirmed",
};

export type ProposalComponentKind = "hotel" | "flight" | "transport" | "activity" | "package" | "other";

export const PROPOSAL_COMPONENT_LABEL: Record<ProposalComponentKind, string> = {
  hotel: "Hotel",
  flight: "Flight",
  transport: "Transportation",
  activity: "Activity",
  package: "Package",
  other: "Other",
};

export type ProposalComponent = {
  id: string;
  kind: ProposalComponentKind;
  name: string;
  description?: string;
  /** A photo already in the media store — see lib/media.ts. */
  photoMediaId?: string;
  /** What this one component costs, in whole currency units (e.g. dollars). */
  price?: number;
  address?: string;
  phone?: string;
  /** kind "flight": which airports, which day. */
  from?: string;
  to?: string;
  date?: string; // YYYY-MM-DD
  /** kind "hotel": the stay. */
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  notes?: string;
};

export type ProposalOption = {
  id: string;
  /** "Option A", "The Ritz package" — whatever the planner calls it. */
  name: string;
  summary?: string;
  photoMediaId?: string;
  components: ProposalComponent[];
  /**
   * The bottom line the client is asked to approve. Planner-entered rather
   * than summed from components — a proposal price is rarely just the parts
   * added up (taxes, a package rate, a deposit already in) — so this is
   * never computed, only ever what the planner actually typed.
   */
  totalPrice?: number;
  currency?: string; // ISO 4217, e.g. "USD" — assumed USD when absent
};

export type ProposalComment = {
  from: "planner" | "client";
  text: string;
  at: string; // ISO timestamp
};

export type Proposal = {
  id: string;
  status: ProposalStatus;
  options: ProposalOption[];
  /** The client's pick, once they've made one. */
  selectedOptionId?: string;
  /** YYYY-MM-DD — past this date the client view says so and stops offering Approve. */
  expiresAt?: string;
  comments: ProposalComment[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
};

export function emptyProposal(): Proposal {
  const now = new Date().toISOString();
  return { id: "", status: "draft", options: [], comments: [], createdAt: now, updatedAt: now };
}

export function emptyProposalOption(name: string): ProposalOption {
  return { id: "", name, components: [] };
}

/** True once a client can no longer approve — past its own expiration date. */
export function proposalExpired(proposal: Proposal, today: string): boolean {
  return Boolean(proposal.expiresAt && today > proposal.expiresAt);
}

/**
 * The selected option, mapped onto the same rows the itinerary builder
 * already edits — appended to whatever the itinerary already holds, never
 * replacing it, so converting a proposal can't silently erase a stop the
 * planner had already entered by hand.
 *
 * NEVER INVENTS A DATE. A component with no date/checkIn/checkOut lands on
 * the itinerary exactly as bare as it was on the proposal — the planner
 * places it afterward, the same as anything added by hand with the date left
 * blank.
 */
export function proposalOptionToItinerary(option: ProposalOption, base: Itinerary): Itinerary {
  const flights: ItinFlight[] = [...base.flights];
  const lodging: ItinLodging[] = [...base.lodging];
  const activities: ItinActivity[] = [...base.activities];

  for (const c of option.components) {
    const id = `proposal-${option.id}-${c.id}`;
    if (c.kind === "flight") {
      flights.push({
        id,
        from: c.from || "",
        to: c.to || "",
        date: c.date || "",
        notes: [c.description, c.notes].filter(Boolean).join(" — ") || undefined,
      });
    } else if (c.kind === "hotel") {
      lodging.push({
        id,
        type: "hotel",
        name: c.name,
        address: c.address,
        phone: c.phone,
        checkIn: c.checkIn || "",
        checkOut: c.checkOut || "",
        notes: [c.description, c.notes].filter(Boolean).join(" — ") || undefined,
      });
    } else {
      // transport, activity, package, other — all a stop on a day, the same
      // as anything the planner would otherwise type into the builder.
      activities.push({
        id,
        name: c.name,
        address: c.address,
        phone: c.phone,
        date: c.date || "",
        notes: [c.description, c.notes].filter(Boolean).join(" — ") || undefined,
      });
    }
  }

  return { ...base, flights, lodging, activities };
}
