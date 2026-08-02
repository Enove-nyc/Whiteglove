/**
 * Whether a coordinate somebody typed can be where they say it is.
 *
 * A coordinate on this site is not decoration. It is what the planner measures
 * a driving time from, what the map drops a pin on, and what "navigate here"
 * hands to Google Maps — so a wrong one does not look wrong, it sends somebody
 * to a field forty kilometres from the kever they drove all day for.
 *
 * NOTHING HERE FILLS A COORDINATE IN. That is the owner's standing rule on the
 * kever screen and it is right: leave it blank unless you know the actual
 * grave, because an approximate pin at the wrong end of a town is worse than an
 * address and a phone call. A town-centre coordinate quietly written into a
 * grave's record would be exactly that pin, and it would look checked.
 *
 * So this only ever CHECKS. Two refusals for coordinates that cannot be a place
 * at all, and one QUESTION — is this really the same place as the address? —
 * which is a question and not a refusal, because the person typing may know
 * something the map does not.
 */

import { coordinatesToPoint } from "@/data/route-utils";

/**
 * How far from the address before it is worth asking about.
 *
 * A beis hachaim is at the edge of its town, not in another country. Twenty-five
 * kilometres is comfortably outside any town and comfortably inside "the map put
 * the address in the middle of a big city and the grave is on the outskirts",
 * which is the ordinary case this must not nag about.
 */
export const FAR_KM = 25;

/** Kilometres between two points, straight line. */
export function kmApart(a: string | undefined, b: string | undefined): number | null {
  const from = coordinatesToPoint(a);
  const to = coordinatesToPoint(b);
  if (!from || !to) return null;
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Why this coordinate cannot be saved, or null.
 *
 * An empty one is fine and always has been — "we do not know where the grave
 * is" is a true thing to record, and far better than a guess.
 */
export function coordinateProblem(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  const point = coordinatesToPoint(value);
  if (!point) {
    return "That is not a coordinate. Paste the two numbers Google Maps shows, like 50.251139, 22.422611.";
  }
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return "That is not a coordinate. Paste the two numbers Google Maps shows, like 50.251139, 22.422611.";
  }
  if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    return "Those numbers are not a place on earth. Check they are the right way round — latitude first, then longitude.";
  }
  // What an empty form, a failed parse, or a swapped pair of blanks produces.
  // Refused by name because "0, 0" reads like a real value on a screen.
  if (point.lat === 0 && point.lng === 0) return "0, 0 is in the Atlantic. Check the coordinates.";
  return null;
}

/**
 * Is this coordinate anywhere near the address it is filed under?
 *
 * A QUESTION, NOT A REFUSAL. The commonest cause is a typo — a transposed digit
 * moves a pin a hundred kilometres and nothing about the number looks wrong —
 * but the second commonest is that the person typing knows where the grave is
 * and the map does not, which happens constantly on these routes. Refusing
 * would lose the second to catch the first.
 *
 * Null when there is nothing to compare, which is most of the time.
 */
export function farFromAddress(
  coordinate: string | undefined,
  addressCoordinate: string | undefined,
  addressLabel?: string,
): string | null {
  const km = kmApart(coordinate, addressCoordinate);
  if (km === null || km <= FAR_KM) return null;
  const rounded = km >= 100 ? Math.round(km) : Math.round(km * 10) / 10;
  const place = addressLabel?.trim() ? `“${addressLabel.trim()}”` : "the address";
  return `That coordinate is about ${rounded} km from ${place}. If that is right, carry on — if a digit is out, this is where it shows.`;
}

/**
 * What is worth saying about a coordinate, in one line, for a screen.
 *
 * Deliberately says nothing when there is nothing to say: a form that
 * congratulates somebody on typing a number teaches them to stop reading it.
 */
export function describeCoordinate(coordinate: string | undefined, addressCoordinate?: string, addressLabel?: string): { tone: "problem" | "question" | "none"; says: string } {
  const problem = coordinateProblem(coordinate);
  if (problem) return { tone: "problem", says: problem };
  const far = farFromAddress(coordinate, addressCoordinate, addressLabel);
  if (far) return { tone: "question", says: far };
  return { tone: "none", says: "" };
}
