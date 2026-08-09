"use client";

import { createContext, useContext } from "react";
import { bookingLink, type BookingLink } from "@/lib/booking-access";

/**
 * Where the booking links go, for the parts of the site that run in the browser.
 *
 * The header menu, the planner's "Book the flights" panel and the nearest-airport
 * list are all client components, and every one of them used to have `/book`
 * typed into it. Whether that path is reachable is a server fact — it is read
 * from the owner's locked-sections setting — so it is resolved once in the root
 * layout and handed down here rather than fetched three times in the browser or
 * guessed.
 *
 * The default is the public search, which is what an unconfigured deployment
 * and every test render get: nothing is locked, so nothing is redirected.
 */

const BookingLinkContext = createContext<BookingLink>(bookingLink([]));

export function BookingLinkProvider({ value, children }: { value: BookingLink; children: React.ReactNode }) {
  return <BookingLinkContext.Provider value={value}>{children}</BookingLinkContext.Provider>;
}

export function useBookingLink(): BookingLink {
  return useContext(BookingLinkContext);
}
