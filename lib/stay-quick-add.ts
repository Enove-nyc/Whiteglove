/**
 * A place to stay can be added from a pin, and finished later.
 *
 * THE FORM USED TO REFUSE ANYTHING SHORT OF A FINISHED LISTING: a one-line
 * summary, the shul or quarter distances are measured from with its
 * coordinates, and a source. Four hard gates in front of the cheapest act
 * there is — writing down a hotel somebody just found — so the hotel did not
 * get written down. The owner's words: "I do not want to make it a must. I'd
 * rather do the info afterwards than hold them back."
 *
 * The cemetery form already worked this way ("Only a name and city are
 * required — fill in the rest later") and nothing went wrong. This brings the
 * stay form in line with it, on the same terms: what is missing decides
 * whether the listing is PUBLISHED or waits in review, never whether it can be
 * saved at all.
 *
 * THREE RULES, ALL PURE, ALL TESTED WITHOUT A DATABASE:
 *
 *   • A stay with everything the site normally requires publishes exactly as
 *     it always did. One with anything missing lands in review instead — the
 *     standing rule that unfinished sections stay hidden until they are useful
 *     is kept by status, not by a gate.
 *   • A stay sent with its OWN pin and no anchor is anchored to that pin, the
 *     way a traveller-submitted stay already is (publishSubmittedPlace in
 *     lib/content-admin.ts). It is named as the stay, so the listing editor
 *     shows plainly that distances are from the hotel and not from a shul.
 *   • Every stay names a city, and a city with no destination page gets one,
 *     in review, so the owner fills it in rather than finds it missing.
 */

import type { ContentStatus } from "@prisma/client";

const COORDS = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

export function looksLikeCoordinates(value: string): boolean {
  return COORDS.test(value);
}

/** What the site normally asks for before a stay is shown to a customer. */
export type StayCompleteness = {
  summary: string;
  anchorName: string;
  anchorCoords: string;
  sourceUrl: string;
};

/** Which of the normally-required fields this stay is still missing, in the order the form shows them. */
export function missingForPublish(stay: StayCompleteness): string[] {
  const missing: string[] = [];
  if (!stay.summary.trim()) missing.push("a one-line summary");
  if (!stay.anchorName.trim() || !looksLikeCoordinates(stay.anchorCoords)) missing.push("the shul or quarter it is measured from");
  if (!stay.sourceUrl.trim()) missing.push("a source");
  return missing;
}

/**
 * Published when complete, otherwise held for review.
 *
 * Never a third state, and never PUBLISHED with a blank: a customer reading
 * "Sent from a pin" under a hotel with no distances has been shown the site's
 * to-do list.
 */
export function statusForNewStay(stay: StayCompleteness): ContentStatus {
  return missingForPublish(stay).length === 0 ? "PUBLISHED" : "NEEDS_REVIEW";
}

/**
 * The anchor to store, given what was typed.
 *
 * A named anchor with real coordinates wins. Failing that, the stay's own pin
 * stands in — named as the stay, so the listing editor shows plainly that the
 * distances are from the hotel and not from a shul. Failing both, blank, which
 * `statusForNewStay` turns into review.
 */
export function anchorFor(input: {
  name: string;
  anchorName: string;
  anchorCoords: string;
  ownCoords: string;
}): { anchorName: string; anchorCoords: string } {
  if (input.anchorName.trim() && looksLikeCoordinates(input.anchorCoords)) {
    return { anchorName: input.anchorName.trim(), anchorCoords: input.anchorCoords.trim() };
  }
  if (looksLikeCoordinates(input.ownCoords)) {
    return { anchorName: input.name.trim(), anchorCoords: input.ownCoords.trim() };
  }
  return { anchorName: input.anchorName.trim(), anchorCoords: "" };
}

/** The slug a destination made from a city name gets — the same shape the admin uses by hand. */
export function destinationSlugFor(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** What to tell the owner after a save, in one sentence, from what actually happened. */
export function savedStayMessage(name: string, status: ContentStatus, missing: string[], destinationMade: string | null): string {
  const where = destinationMade ? ` A destination page for ${destinationMade} was started for you, in review.` : "";
  if (status === "PUBLISHED") {
    return `Added “${name}”. It is in the where-to-stay list, the search and the hotel picker now.${where}`;
  }
  return `Saved “${name}” for review — it still needs ${missing.join(", ")} before it shows to customers.${where}`;
}
