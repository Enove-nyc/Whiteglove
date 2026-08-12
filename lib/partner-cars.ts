/**
 * Car hire results for /book.
 *
 * Stay22's Direct Travel API is accommodations only. Travelpayouts Data API is
 * flights. EconomyBookings and DiscoverCars advertise inventory APIs, but those
 * need separate credentials (not TRAVELPAYOUTS_TOKEN) and none are configured
 * here. Until one is, this returns an on-site compare row whose CTA is a
 * tracked /go link — destination and dates filled, partner takes payment.
 */

import { goHref } from "@/lib/affiliate/request";

export type PartnerCarOption = {
  id: string;
  title: string;
  subtitle: string;
  bookHref: string;
};

export type PartnerCarSearch = {
  destination: string;
  checkIn: string;
  checkOut: string;
};

export type PartnerCarResult =
  | { ok: true; mode: "compare"; cars: PartnerCarOption[]; message: string; detail?: string }
  | { ok: false; mode: "unavailable"; message: string; detail?: string };

export function searchPartnerCars(search: PartnerCarSearch): PartnerCarResult {
  const destination = search.destination.trim();
  if (!destination) {
    return { ok: false, mode: "unavailable", message: "Enter a pick-up city or airport." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(search.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(search.checkOut)) {
    return { ok: false, mode: "unavailable", message: "Choose pick-up and drop-off dates." };
  }
  if (search.checkOut < search.checkIn) {
    return { ok: false, mode: "unavailable", message: "Drop-off must be on or after pick-up." };
  }

  const bookHref = goHref({
    product: "car",
    destination,
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    page: "/book",
    placement: "book-cars",
  });

  return {
    ok: true,
    mode: "compare",
    message: "Compare cars for your dates with a booking partner.",
    detail: "Prices and payment are on their site.",
    cars: [
      {
        id: "cars-all",
        title: `Cars in ${destination}`,
        subtitle: `${search.checkIn} → ${search.checkOut}`,
        bookHref,
      },
    ],
  };
}
