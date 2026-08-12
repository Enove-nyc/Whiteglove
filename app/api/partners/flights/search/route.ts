import { NextResponse, type NextRequest } from "next/server";
import { searchPartnerFlights } from "@/lib/partner-flights";
import { resolveEndpoint } from "@/lib/flight-endpoint";

export const dynamic = "force-dynamic";

/**
 * Flight search for /book.
 *
 * Priced rows (Travelpayouts Data API) open that fare's Aviasales link with
 * the marker. Otherwise — and as an extra row beside priced fares — a compare
 * row whose View & book is /go → Stay22 Kayak. Never a Travelpayouts price
 * with a Kayak URL. Stay22 has no flights inventory API.
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

  const result = await searchPartnerFlights({
    origin,
    destination,
    departDate,
    returnDate: returnDate || undefined,
    nonstop,
    adults,
  });

  if (!result.ok) {
    const badInput = /Choose|must be after/i.test(result.message);
    return NextResponse.json(result, { status: badInput ? 400 : 503 });
  }

  return NextResponse.json(
    {
      ...result,
      searched: {
        origin: originPlace?.label ?? origin,
        destination: destinationPlace?.label ?? destination,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
