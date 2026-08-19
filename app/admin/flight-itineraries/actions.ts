"use server";

import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import {
  flightItineraryFromInput,
  flightItineraryProblem,
  type FlightItineraryInput,
  type FlightLeg,
} from "@/lib/flight-itinerary";
import {
  addFlightItinerary,
  flightItineraryStoreAvailable,
  removeFlightItinerary,
} from "@/lib/flight-itinerary-store";

export type ActionResult = { ok: boolean; message: string };

// A server action is its own door — checked here as well as by the layout's
// AreaGate, because anything that knows its name can call it. Flight
// itineraries sit in the "money" area with Duffel and the travel providers:
// they are about the flights the owner sells, not the site's content.
async function gate(): Promise<ActionResult | null> {
  const { identity, areas } = await currentAdmin();
  if (!identity) return { ok: false, message: "Please sign in." };
  if (!mayUse(areas, "money")) return { ok: false, message: "Your sign-in does not cover this." };
  if (!flightItineraryStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected before an itinerary can be saved." };
  }
  return null;
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** The legs arrive as a single JSON field so the form can hold as many as it likes. */
function parseLegs(formData: FormData): Array<Omit<FlightLeg, "id">> {
  const raw = formData.get("legs");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((leg) => ({
      airline: typeof leg?.airline === "string" ? leg.airline : "",
      flightNumber: typeof leg?.flightNumber === "string" ? leg.flightNumber : "",
      from: typeof leg?.from === "string" ? leg.from : "",
      to: typeof leg?.to === "string" ? leg.to : "",
      departDate: typeof leg?.departDate === "string" ? leg.departDate : "",
      departTime: typeof leg?.departTime === "string" ? leg.departTime : "",
      arriveDate: typeof leg?.arriveDate === "string" ? leg.arriveDate : "",
      arriveTime: typeof leg?.arriveTime === "string" ? leg.arriveTime : "",
      cabin: typeof leg?.cabin === "string" ? leg.cabin : "",
      confirmation: typeof leg?.confirmation === "string" ? leg.confirmation : "",
      notes: typeof leg?.notes === "string" ? leg.notes : "",
    }));
  } catch {
    return [];
  }
}

export async function addFlightItineraryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const input: FlightItineraryInput = {
    title: str(formData, "title"),
    passengers: str(formData, "passengers"),
    reference: str(formData, "reference"),
    notes: str(formData, "notes"),
    legs: parseLegs(formData),
  };

  const problem = flightItineraryProblem(input);
  if (problem) return { ok: false, message: problem };

  const itinerary = flightItineraryFromInput(input);
  if (!(await addFlightItinerary(itinerary))) return { ok: false, message: "That could not be saved." };
  return { ok: true, message: "Saved. It has a link to send below." };
}

export async function removeFlightItineraryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await gate();
  if (denied) return denied;

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Nothing to remove." };
  if (!(await removeFlightItinerary(id))) return { ok: false, message: "That could not be removed." };
  return { ok: true, message: "Removed. Its link no longer works." };
}
