import { NextResponse, type NextRequest } from "next/server";
import { searchTravelpayoutsFlights } from "@/lib/travelpayouts-api";
import { resolveEndpoint } from "@/lib/flight-endpoint";
import { goHref } from "@/lib/affiliate/request";

export const dynamic = "force-dynamic";

/**
 * Public live flight prices via Travelpayouts Data API.
 * Booking and payment stay with the partner (/go hand-off).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const originPlace = resolveEndpoint(body?.origin);
  const destinationPlace = resolveEndpoint(body?.destination);
  const origin = originPlace?.code ?? String(body?.origin ?? "").trim().toUpperCase();
  const destination = destinationPlace?.code ?? String(body?.destination ?? "").trim().toUpperCase();
  const departDate = String(body?.departDate ?? "").trim();
  const returnDate = body?.returnDate ? String(body.returnDate).trim() : undefined;
  const nonstop = Boolean(body?.nonstop);
  const adults = Math.max(1, Math.min(9, Number(body?.adults) || 1));

  const result = await searchTravelpayoutsFlights({
    origin,
    destination,
    departDate,
    returnDate: returnDate || undefined,
    nonstop,
  });

  if (!result.ok) {
    const badInput = /Choose|must be after/i.test(result.message);
    return NextResponse.json(result, { status: badInput ? 400 : 503 });
  }

  return NextResponse.json(
    {
      ...result,
      flights: result.flights.map((flight) => ({
        ...flight,
        bookHref: goHref({
          product: "flight",
          legs: [{ from: flight.origin, to: flight.destination, date: flight.departDate }],
          checkOut: flight.returnDate,
          adults,
          nonstop,
          page: "/book",
          placement: "book-flights",
        }),
      })),
      searched: {
        origin: originPlace?.label ?? origin,
        destination: destinationPlace?.label ?? destination,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
