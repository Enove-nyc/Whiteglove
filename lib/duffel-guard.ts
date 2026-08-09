/**
 * The Duffel endpoints are for the admin, and only the admin.
 *
 * TAKING THE BUTTONS OFF THE PAGE IS NOT THE SAME AS CLOSING THE DOOR.
 * /api/flights/search, /api/flights/book, /api/hotels/search and
 * /api/duffel/component-key are ordinary HTTP endpoints: anybody who reads the
 * old JavaScript, or who saw the site last month, can still post to them. One
 * of them issues a ticket against the White Glove account and charges a card.
 *
 * So the guard is here, on the endpoints, rather than in the absence of a link
 * to them. Same admin cookie the rest of the admin API uses, and same
 * same-origin check on anything that writes.
 */

import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

type GuardedRequest = {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
};

/** Null when the request may proceed; otherwise what to say and with what status. */
export function duffelRefusal(request: GuardedRequest, { write = true } = {}): { error: string; status: number } | null {
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return { error: "Flight booking is not available here.", status: 404 };
  }
  if (write && !sameOrigin(request)) {
    return { error: "That request did not come from this site.", status: 403 };
  }
  return null;
}
