import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/lib/secure-access";
import { keepForCheckout } from "@/lib/travel/checkout-handles";
import { searchTravel } from "@/lib/travel/engine";
import { searchPartnerCars } from "@/lib/partner-cars";

export const dynamic = "force-dynamic";

/**
 * Rental cars for the public site.
 *
 * `audience: "public"` — the only place in the codebase that value is passed
 * from a route a visitor can reach. Which companies may answer is decided in
 * lib/travel/registry.ts, and a provider that would make White Glove the
 * seller is refused here no matter what its stage says (see engine.ts). So if
 * the owner has not set a car provider to "Live for visitors", this answers
 * with nothing and the page shows its partner search instead. That is the
 * intended state, not a fault.
 *
 * NOTHING PRIVATE, AND NO PROVIDER INTERNALS. The response is built field by
 * field. `raw` — the provider payload their checkout needs back — is kept on
 * the server behind one handle and never serialised here.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    destination?: string;
    startDate?: string;
    endDate?: string;
  } | null;

  const destination = String(body?.destination ?? "").trim().slice(0, 120);
  if (!destination) return NextResponse.json({ error: "Enter a pick-up city or airport." }, { status: 400 });

  const date = (value: unknown) => {
    const text = String(value ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  };
  const startDate = date(body?.startDate);
  const endDate = date(body?.endDate);
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Choose pick-up and drop-off dates." }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "Drop-off must be on or after pick-up." }, { status: 400 });
  }

  const outcome = await searchTravel("car", { destination, startDate, endDate }, "public");

  // ONE HANDLE FOR THE WHOLE SEARCH, not one per car. Seventy-one cars would
  // otherwise be seventy-one writes for a page most people never click twice.
  const withPayload = outcome.offers.filter((offer) => offer.raw !== undefined);
  const handle = withPayload.length
    ? await keepForCheckout({
        provider: "routestack",
        category: "car",
        payload: withPayload.map((offer) => offer.raw),
      })
    : null;

  const cars = outcome.offers.map((offer) => {
    const index = withPayload.indexOf(offer);
    return {
      id: offer.id,
      headline: offer.headline,
      detail: offer.detail,
      price: offer.price,
      carClass: offer.meta.carClass,
      image: offer.meta.image,
      supplier: offer.meta.supplier,
      supplierLogo: offer.meta.supplierLogo,
      mileage: offer.meta.mileage,
      cancellation: offer.meta.cancellation,
      deposit: offer.meta.deposit,
      // A car whose hand-off could not be stored is shown without a button
      // rather than with one that dead-ends at the moment somebody wants to pay.
      bookHref: handle && index >= 0 ? `/api/travel/cars/go?h=${handle}&i=${index}` : undefined,
    };
  });

  /**
   * WHEN THERE ARE NO PRICES, THERE IS STILL A CAR SEARCH.
   *
   * Our own prices come from a metered provider on a small monthly allowance.
   * When it is spent, or switched off, or simply having a bad afternoon, the
   * honest thing is not an empty list — it is the search this site had before
   * it had prices of its own: one tracked hand-off to a booking partner, which
   * costs nothing per search and cannot run out.
   *
   * It is a fallback and never an addition. Showing a "compare with a partner"
   * row underneath a list of real prices is offering somebody a worse version
   * of what they are already looking at.
   */
  const partner = cars.length
    ? null
    : (() => {
        const found = searchPartnerCars({ destination, checkIn: startDate, checkOut: endDate });
        return found.ok ? { href: found.cars[0]?.bookHref ?? "", message: found.message } : null;
      })();

  return NextResponse.json(
    { cars, partial: outcome.partial, partner: partner?.href ? partner : undefined },
    { headers: { "Cache-Control": "no-store" } },
  );
}
