import { NextResponse, type NextRequest } from "next/server";
import { searchPartnerCars } from "@/lib/partner-cars";

export const dynamic = "force-dynamic";

/**
 * Car hire search for /book. No live inventory API is configured, so this
 * returns an on-site compare row whose bookHref is /go (tracked). Payment
 * stays with the partner.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const destination = String(body?.destination ?? "").trim();
  const checkIn = String(body?.checkIn ?? "").trim();
  const checkOut = String(body?.checkOut ?? "").trim();

  const result = searchPartnerCars({ destination, checkIn, checkOut });
  if (!result.ok) {
    const badInput = /Enter|Choose|must be/i.test(result.message);
    return NextResponse.json(result, { status: badInput ? 400 : 503 });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
