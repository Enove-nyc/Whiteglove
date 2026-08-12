import { NextResponse, type NextRequest } from "next/server";
import { readStay22 } from "@/lib/stay22-store";
import { searchStay22Accommodations } from "@/lib/stay22-api";

export const dynamic = "force-dynamic";

/**
 * Public live places-to-stay search via Stay22 Direct Travel API.
 * Payment happens on the partner deeplink — never on White Glove.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const destination = String(body?.destination ?? "").trim();
  const checkIn = String(body?.checkIn ?? "").trim();
  const checkOut = String(body?.checkOut ?? "").trim();
  const adults = Math.max(1, Math.min(30, Number(body?.adults) || 2));

  const settings = await readStay22();
  const result = await searchStay22Accommodations(
    { address: destination, checkin: checkIn, checkout: checkOut, adults },
    settings,
  );

  if (!result.ok) {
    return NextResponse.json(result, { status: result.message.includes("Enter") || result.message.includes("Choose") || result.message.includes("Check-out") ? 400 : 503 });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
