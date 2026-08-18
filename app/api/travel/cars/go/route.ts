import { NextResponse, type NextRequest } from "next/server";
import { routestackConfig, routestackPost } from "@/lib/travel/adapters/routestack-auth";
import { readForCheckout } from "@/lib/travel/checkout-handles";
import { publicUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

/**
 * The hand-off: a traveler picked a car, and this sends them to the desk.
 *
 * WHITE GLOVE IS NOT IN THIS TRANSACTION. RouteStack is merchant of record.
 * This asks them for the checkout link belonging to the car we quoted and
 * redirects; no card is seen here, no order is created here, and nothing about
 * the traveler is stored. If that ever changes it will be a decision somebody
 * makes, not a thing that grew.
 *
 * WHAT GOES TO THEM IS WHAT CAME FROM THEM. Their endpoint wants the whole car
 * object back, and it is read from the server-side handle rather than from the
 * request, so the price somebody is sent to pay is the price they were shown.
 * The query string carries only which search and which row.
 */
export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get("h") ?? "";
  const index = Number(request.nextUrl.searchParams.get("i"));
  const kept = await readForCheckout(handle);
  const rows = Array.isArray(kept?.payload) ? (kept.payload as unknown[]) : [];
  const chosen = Number.isInteger(index) && index >= 0 ? rows[index] : undefined;

  // An expired quote is the ordinary case, not an error: prices move and desks
  // sell out, and thirty minutes is all a handle lives. So the traveler is sent
  // back to search again rather than shown anything about handles.
  const searchAgain = publicUrl(request, "/book?kind=cars&expired=1");
  if (!chosen || kept?.provider !== "routestack") return NextResponse.redirect(searchAgain, 303);

  const config = routestackConfig();
  if (!config) return NextResponse.redirect(searchAgain, 303);

  const car = chosen as { car?: unknown; pickup?: unknown; dropoff?: unknown };
  try {
    const answer = await routestackPost<{ url?: string; result?: { url?: string } }>(
      config,
      "/mcp/car/get-payment-url",
      {
        car: car.car,
        pickup: car.pickup,
        dropoff: car.dropoff,
        // Their required fields duplicate the dates that are already inside
        // pickup and dropoff. Sent from the same object so the two cannot drift.
        pickupDate: (car.pickup as { date?: string } | undefined)?.date,
        dropoffDate: (car.dropoff as { date?: string } | undefined)?.date,
      },
      AbortSignal.timeout(20000),
      20000,
    );
    const url = answer.url ?? answer.result?.url;
    // Only ever to them. A checkout URL is a redirect target handed to us by a
    // third party, and following it anywhere else would make this an open
    // redirect on a public route.
    const target = url ? new URL(url) : null;
    if (!target || !/(^|\.)routestack\.ai$/.test(target.hostname)) {
      return NextResponse.redirect(searchAgain, 303);
    }
    return NextResponse.redirect(target, 303);
  } catch (error) {
    // The traveler gets a way forward; the detail goes to the logs, where a
    // provider's error text cannot be read by whoever it was quoting.
    console.warn("[cars] checkout hand-off failed", error instanceof Error ? error.message : error);
    return NextResponse.redirect(searchAgain, 303);
  }
}
