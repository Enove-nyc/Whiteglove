import { NextResponse, type NextRequest } from "next/server";
import { searchPartnerFlights } from "@/lib/partner-flights";
import { resolveEndpoint } from "@/lib/flight-endpoint";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Flight search for /book.
 *
 * Live rows come from the Travelpayouts Flight Search API (the Aviasales
 * board). Each priced row opens that offer. Kayak Compare is a separate
 * /go link with no price. The cheapest-cache dump is not this list.
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
  const legs = Array.isArray(body?.legs)
    ? body.legs.slice(0, 6).map((leg: { from?: string; to?: string; date?: string }) => ({
        from: String(leg?.from ?? "").trim(),
        to: String(leg?.to ?? "").trim(),
        date: String(leg?.date ?? "").trim(),
      }))
    : [];

  const userIp = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || undefined;

  const result = await searchPartnerFlights({
    origin,
    destination,
    departDate,
    returnDate: returnDate || undefined,
    legs: legs.length >= 2 ? legs : undefined,
    nonstop,
    adults,
    userIp,
  });

  if (!result.ok) {
    const badInput = /Choose|must be after|cannot be in the past|already passed|leaves before|Add a flight/i.test(result.message);
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
