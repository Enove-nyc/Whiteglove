import { redirect } from "next/navigation";

/**
 * Travel Essentials has moved into "What the site earns".
 *
 * TWO SCREENS FOR ONE QUESTION. This one held the cards — insurance, eSIM,
 * transfers, tours — and /admin/settings/earnings held the searches, the hotel
 * ID, the destination placements and the free-form offers. Both answered "is
 * this site earning, and where", and whichever one you were on looked complete
 * on its own: a perfectly configured set of searches told you nothing about
 * four cards sitting disabled on the other screen, and the reverse was worse,
 * because a card is the thing most likely to be pasted and never enabled.
 *
 * A REDIRECT RATHER THAN A DELETION, because this address is in the admin's own
 * history, in the quick-add list, and in whatever the owner has bookmarked —
 * and an admin screen that 404s reads as something broken rather than something
 * moved. It lands on the section itself, not the top of the page.
 */
export default function TravelEssentialsMoved() {
  redirect("/admin/settings/earnings#travel-essentials");
}
