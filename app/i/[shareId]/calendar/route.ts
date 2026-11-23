import { getSharedItineraryByShareId } from "@/lib/account-store";
import { SAMPLE_ITINERARY, SAMPLE_TRIP_CODE } from "@/data/sample-itinerary";
import { tripCalendarResponse } from "@/lib/trip-calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const itinerary = shareId === SAMPLE_TRIP_CODE ? SAMPLE_ITINERARY : (await getSharedItineraryByShareId(shareId))?.itinerary;
  return tripCalendarResponse(itinerary ?? null, shareId);
}
