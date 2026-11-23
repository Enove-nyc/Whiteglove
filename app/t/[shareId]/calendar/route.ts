import { emptyItinerary, redactForTraveler } from "@/data/itinerary";
import { getSharedTraveler } from "@/lib/account-store";
import { tripCalendarResponse } from "@/lib/trip-calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedTraveler(shareId);
  const itinerary = shared
    ? redactForTraveler({ ...emptyItinerary(), ...shared.itinerary }, shared.traveler.id, { individual: true })
    : null;
  return tripCalendarResponse(itinerary, shared?.walletKey ?? shareId);
}
