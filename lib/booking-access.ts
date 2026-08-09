/**
 * Where "Flights, hotels & cars" is allowed to send somebody.
 *
 * THE FAILURE THIS EXISTS TO END. The footer, the services page and every
 * destination page offered "Flights, hotels & cars" and "Search flights, hotels
 * and cars for these dates". `/book` is not gated in the code — but the owner
 * can lock single paths from /admin/settings/website, and on the live site that
 * lock is on. So a first-time visitor pressing a public link on a public page
 * met an access-code box. That is the end of the visit, and it is worse than
 * not offering the link at all, because the visitor now believes the whole site
 * is somebody's private tool.
 *
 * lib/navigation.ts already carried the rule for the top bar — "nothing in the
 * bar may lead to an access code" — and enforced it by keeping `/book` out of
 * the bar. That was right and it was not enough: the rule belongs to every
 * public call to action, not only the five in the header.
 *
 * SO THE LINK IS RESOLVED RATHER THAN TYPED. Every public booking link asks
 * this module where to go. When the search is reachable it goes to the search,
 * exactly as before. When the owner has locked it, the same link goes to the
 * public flights-and-hotels assistance page instead — which is a real page
 * about the same job, not a dead end — and it says what it actually does, so
 * nobody presses "search and book it yourself" and lands somewhere they cannot
 * search or book anything.
 *
 * WHOLE-SITE LOCK IS NOT CONSIDERED HERE, deliberately. When the site itself is
 * closed, the visitor typed a code to reach the page the link is on; a link to
 * another page behind the same code is not a surprise. This is about the case
 * where the page is open and the destination is not.
 *
 * Pure and takes the locked paths as an argument, so the same function serves
 * the server read (lib/booking-access-store.ts), the client components that get
 * it through the layout, and the tests.
 */

/** The self-service search: Duffel flights, Duffel Stays, cars. */
export const BOOKING_SEARCH_PATH = "/book";

/**
 * The public page about the same thing, and the fallback.
 *
 * It is a real page — what to send us, what we look at, and a form that says
 * plainly when personal booking is not open — rather than a redirect or a
 * holding note. Chosen over `/contact` because it is specifically about
 * flights and hotels, which is what the visitor pressed.
 */
export const BOOKING_HELP_PATH = "/flight-booking-assistance";

export type BookingLink = {
  href: string;
  /** What the link should say. Never promises a search that is not there. */
  label: string;
  /** The longer line, for the menu panel and anywhere a bare noun would do. */
  description: string;
  /** True when `href` is the search itself. Copy that says "book it yourself" is conditional on this. */
  searchIsPublic: boolean;
};

/**
 * Is this path behind the access code?
 *
 * The same prefix rule middleware.ts applies, and it has to stay the same: a
 * lock on `/book` covers `/book/review`, and a lock on `/books` must not cover
 * `/book`. Trailing slashes are trimmed because the admin stores what was
 * typed.
 */
export function pathIsLocked(path: string, lockedPaths: readonly string[]): boolean {
  return lockedPaths.some((raw) => {
    const prefix = raw.trim().replace(/\/+$/, "");
    return prefix.length > 0 && (path === prefix || path.startsWith(`${prefix}/`));
  });
}

const PUBLIC_SEARCH: BookingLink = {
  href: BOOKING_SEARCH_PATH,
  label: "Flights, hotels & cars",
  description: "Search and book your own travel, with cash or with points.",
  searchIsPublic: true,
};

const ASK_INSTEAD: BookingLink = {
  href: BOOKING_HELP_PATH,
  label: "Flights & hotels",
  description: "Tell us the route and dates, and we will look into the flights and the hotels for you.",
  searchIsPublic: false,
};

/**
 * The one that goes on the page.
 *
 * If the assistance page is locked too, this still points at it rather than
 * inventing a third destination: at that point the owner has closed both halves
 * of the same section deliberately, and every remaining choice is a locked page.
 */
export function bookingLink(lockedPaths: readonly string[]): BookingLink {
  return pathIsLocked(BOOKING_SEARCH_PATH, lockedPaths) ? ASK_INSTEAD : PUBLIC_SEARCH;
}

/**
 * The link with search terms on it — dates, airports — from the planner and the
 * destination pages.
 *
 * The query string is dropped when the search is not public, because those
 * parameters mean nothing to the assistance page and a URL carrying
 * `?type=flights&to=FCO` to a page with no search on it reads as a broken link.
 */
export function bookingHref(link: BookingLink, params?: Record<string, string | undefined>): string {
  if (!link.searchIsPublic) return link.href;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `${link.href}?${suffix}` : link.href;
}

/**
 * What the self-service call to action may say.
 *
 * "Search here and book it yourself — everything on the booking page is yours
 * to use now" was on the services page while the booking page was behind a
 * password. Both halves of that sentence were wrong at once, and it is the kind
 * of sentence that gets written once and never re-read, so the wording is
 * chosen here from the same fact the href is.
 */
export function bookingCallToAction(link: BookingLink): { label: string; blurb: string } {
  return link.searchIsPublic
    ? {
        label: "Search flights, hotels and cars",
        blurb: "Search here and book it yourself, with cash or with your own miles and points.",
      }
    : {
        label: "Ask us about flights and hotels",
        blurb:
          "The self-service search is not open to visitors at the moment. Send us the route and the dates and we will look into it.",
      };
}
