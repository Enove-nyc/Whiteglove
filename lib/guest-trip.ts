/**
 * Where a visitor who is not signed in keeps their trip: their own browser,
 * and nowhere else (AGENTS.md, 18 November 2026). Shared by the planner and
 * the home page's "Start your itinerary", which is why it lives here rather
 * than inside the planner — importing the planner to read one constant would
 * ship the whole planner to the home page.
 */
export const GUEST_TRIP_KEY = "wg-guest-itinerary";
