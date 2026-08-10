/**
 * Routing the three searches through Travelpayouts, so they earn.
 *
 * WHY THIS IS NOT "APPEND THE MARKER". A marker is not a key you sprinkle on a
 * link. Travelpayouts earns by owning the redirect: the visitor goes to
 * tp.media, Travelpayouts records the marker and forwards them to the partner.
 * Adding `marker=761677` to a kayak.com address does nothing at all — Kayak has
 * never heard of it. That is exactly what the site was doing with the marker it
 * already had: reading it from the environment, carrying it into the booking
 * page, and applying it to nothing.
 *
 * AND THE PROGRAMME HAS TO MATCH. A redirect link generated for Booking.com
 * forwards to Booking.com and credits the Booking.com programme. Handing it a
 * Kayak address does not turn it into a Kayak link; it produces a link that
 * either fails to forward or forwards untracked. So the pasted link is checked
 * against the address this site actually builds for that search, and refused —
 * out loud, before it is saved — when the two disagree. A search can only be
 * configured into a state that really earns.
 *
 * WHAT THE OWNER PASTES is whatever the Travelpayouts dashboard's link builder
 * gives him for that partner. Nothing to learn, no placeholder syntax, no
 * programme number to copy by hand — those numbers differ per account and per
 * programme, and a wrong one is invisible. The link already contains them.
 */

import {
  hostBelongsTo,
  partnerFor,
  type PartnerChoices,
  type SearchSlot,
  type TravelPartner,
} from "@/lib/travel-partners";

export type { SearchSlot };

export type SlotInfo = {
  slot: SearchSlot;
  label: string;
  /** Where that address is built, for anybody going to look. */
  builtIn: string;
};

/**
 * THE HOST USED TO LIVE HERE and no longer does. It said every flight and car
 * search opens www.kayak.com, which made the paste-a-link check below refuse
 * every programme this account is actually approved for. Where a search lands
 * is now the owner's choice — see lib/travel-partners.ts — and this list is
 * only the names of the three slots.
 */
export const SLOTS: readonly SlotInfo[] = [
  { slot: "flights", label: "Flights", builtIn: "lib/travel-partners.ts" },
  { slot: "hotels", label: "Hotels", builtIn: "lib/affiliate/partners.ts" },
  { slot: "cars", label: "Car hire", builtIn: "lib/travel-partners.ts" },
] as const;

export function slotInfo(slot: SearchSlot): SlotInfo {
  // Non-null by construction: SLOTS covers the union.
  return SLOTS.find((s) => s.slot === slot)!;
}

/** One pasted redirect link per search. Absent means that search goes out direct. */
export type TravelpayoutsLinks = Partial<Record<SearchSlot, string>>;

/** The hosts Travelpayouts redirects through. */
const REDIRECT_HOSTS = ["tp.media", "tp.st", "c.travelpayouts.com", "travelpayouts.com"];

/**
 * Travelpayouts' link SHORTENER, which is a different thing from its redirect.
 *
 * The link builder offers both, and the short one is the one it puts in front
 * of you — `https://kiwi.tpx.lv/QdvmP1KC`. It is a real, correctly-marked
 * affiliate link and it is useless here, for the reason every refusal in this
 * file is about: the whole address is eight opaque characters, so there is
 * nowhere to put the traveller's route and dates. It would open the partner's
 * front page and the traveller would search again by hand, which is the exact
 * failure this site is live with today.
 *
 * Named separately from the "that is not a Travelpayouts link at all" case
 * because the two need opposite advice. Telling somebody who has just used the
 * link builder to go and use the link builder is how they conclude the admin
 * is broken — which is what happened.
 */
const SHORTENER_HOSTS = ["tpx.lv", "tpx.li"];

/** Stay22's hosts, which are a different programme with its own setting. */
const STAY22_HOSTS = ["stay22.com"];

function hostIsOneOf(host: string, hosts: readonly string[]): boolean {
  const lower = host.toLowerCase();
  return hosts.some((h) => lower === h || lower.endsWith(`.${h}`));
}

function parse(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function isRedirectHost(host: string): boolean {
  return hostIsOneOf(host, REDIRECT_HOSTS);
}

/**
 * Why this marker cannot be used, or null.
 *
 * Travelpayouts markers are plain numbers. The common mistake is pasting the
 * whole script tag or the base64 blob out of it, which looks like an ID and is
 * not one.
 */
export function markerProblem(marker: string): string | null {
  const value = marker.trim();
  if (!value) return null;
  if (/<|script|https?:/i.test(value)) {
    return "That looks like a script or a link rather than the ID. The marker is the plain number from your Travelpayouts dashboard, e.g. 761677.";
  }
  if (!/^\d+$/.test(value)) return "A Travelpayouts marker is digits only.";
  if (value.length < 4) return "That is too short to be a Travelpayouts marker.";
  return null;
}

/** The marker a pasted redirect link carries, or "". */
export function markerIn(pasted: string): string {
  const url = parse(pasted);
  return url?.searchParams.get("marker")?.trim() ?? "";
}

/** The address a pasted redirect link forwards to, or "". */
export function forwardsTo(pasted: string): string {
  const url = parse(pasted);
  const target = url?.searchParams.get("u")?.trim();
  if (!target) return "";
  // Travelpayouts accepts the target with or without a scheme.
  const absolute = parse(target) ?? parse(`https://${target.replace(/^\/+/, "")}`);
  return absolute?.host ?? "";
}

/**
 * Why this pasted link cannot be used for this search, or null.
 *
 * Every refusal names the consequence rather than the rule, because the whole
 * failure mode here is silent: a link that is wrong in any of these ways still
 * opens a working search page, and the only symptom is that no money ever
 * arrives.
 */
export function linkProblem(pasted: string, slot: SearchSlot, choices?: PartnerChoices): string | null {
  const value = pasted.trim();
  if (!value) return null;
  const info = slotInfo(slot);
  const partner: TravelPartner = partnerFor(slot, choices);

  const url = parse(value);
  if (!url) {
    return "That is not a link. Paste the whole address the Travelpayouts link builder gives you, starting with https://.";
  }
  // Both of these are real affiliate links that the owner really does have.
  // They are refused for what they cannot carry, not for being wrong, so they
  // are answered before the blunter "that is not a Travelpayouts link".
  if (hostIsOneOf(url.host, SHORTENER_HOSTS)) {
    return (
      "That is the shortened link. It works, but the whole address is a code, so there is nowhere to put the " +
      "traveller's route and dates — everyone would land on the partner's front page and have to search again. " +
      "In the link builder, take the full link instead of the short one: it is longer and ends with u= followed by an address."
    );
  }
  if (hostIsOneOf(url.host, STAY22_HOSTS)) {
    return (
      `That is a Stay22 link rather than a Travelpayouts one. Stay22 is set up separately, under the hotels ` +
      `settings, and it is already earning there. This box takes the ${info.label.toLowerCase()} link from your ` +
      "Travelpayouts dashboard."
    );
  }
  if (!isRedirectHost(url.host)) {
    return (
      `That link goes straight to ${url.host}, so nothing passes through Travelpayouts and nothing is credited. ` +
      "Use the link builder in your Travelpayouts dashboard — the link it gives you goes through tp.media."
    );
  }
  if (!markerIn(value)) {
    return "That link carries no marker, so a booking made through it would not be credited to you. Generate it again from your own dashboard.";
  }

  const target = forwardsTo(value);
  if (!target) {
    return (
      "That is a short link, and this site has to be able to swap in the traveller's own search. " +
      "In the link builder, paste a full address for the partner rather than taking the short link, so the link comes back with a u= on the end."
    );
  }
  // The one that catches a genuine mistake: a Booking.com link cannot earn on
  // an Aviasales search, however valid it is in itself. Checked against the
  // partner the owner CHOSE for this search rather than a hard-coded host —
  // the whole reason the choice exists.
  if (!hostBelongsTo(target, partner.domain)) {
    return (
      `That link forwards to ${target}, but the ${info.label.toLowerCase()} search on this site is set to ${partner.label}. ` +
      `A link made for one partner does not track another. Generate it from the ${partner.label} programme, ` +
      `or change the partner above to match the link you have.`
    );
  }
  return null;
}

/**
 * The address to actually open: the visitor's search, sent through Travelpayouts.
 *
 * NEVER THROWS AND NEVER BREAKS A SEARCH. A link that is missing, malformed or
 * for the wrong partner gives back the plain search unchanged — the traveller
 * gets where they were going and the booking simply earns nothing, which is
 * where the site already was. The alternative, a search that fails because a
 * setting is wrong, costs a customer to save a commission.
 */
export function throughTravelpayouts(
  searchUrl: string,
  pasted: string | undefined,
  slot: SearchSlot,
  choices?: PartnerChoices,
): string {
  if (!pasted?.trim()) return searchUrl;
  if (linkProblem(pasted, slot, choices)) return searchUrl;
  const url = parse(pasted);
  if (!url) return searchUrl;
  url.searchParams.set("u", searchUrl);
  return url.toString();
}

/** What this search is doing right now, in one sentence. Never null. */
export function describeSlot(slot: SearchSlot, pasted: string | undefined, choices?: PartnerChoices): string {
  const partner = partnerFor(slot, choices);
  const value = pasted?.trim() ?? "";
  if (!value) {
    return `Opens ${partner.label} directly. It works, and it earns nothing.`;
  }
  const problem = linkProblem(value, slot, choices);
  if (problem) return `Not in use — ${problem}`;
  return `Goes through Travelpayouts under marker ${markerIn(value)}, then on to ${partner.label}.`;
}

/** How many of the three are earning, for the top of the screen. */
export function describeLinks(links: TravelpayoutsLinks, choices?: PartnerChoices): string {
  const live = SLOTS.filter((s) => !linkProblem(links[s.slot] ?? "", s.slot, choices) && (links[s.slot] ?? "").trim());
  if (live.length === 0) {
    return "None of the three searches is going through Travelpayouts yet, so none of them earns anything. Paste a link below to change that.";
  }
  if (live.length === SLOTS.length) {
    return "All three searches go through Travelpayouts. A booking made after one of them should show up in your dashboard.";
  }
  const names = live.map((s) => s.label.toLowerCase()).join(" and ");
  const rest = SLOTS.filter((s) => !live.includes(s)).map((s) => s.label.toLowerCase()).join(" and ");
  return `${names[0].toUpperCase()}${names.slice(1)} go through Travelpayouts and earn. ${rest[0].toUpperCase()}${rest.slice(1)} still open direct and earn nothing.`;
}
