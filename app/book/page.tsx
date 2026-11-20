import { permanentRedirect } from "next/navigation";

/**
 * /book is gone; the booking search is on the home page (owner, 20 November
 * 2026: "I want the /book page to go, everything should be on the main page").
 *
 * Old links — the planner's "Book the flights", bookmarks, search results —
 * still arrive here, so the query comes along: ?type=cars opens the car tab and
 * ?depart=…&return=… fills the dates, exactly as /book did.
 */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["type", "from", "to", "depart", "return", "destination"]) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query.set(key, first.slice(0, 80));
  }
  const suffix = query.toString();
  permanentRedirect(suffix ? `/?${suffix}#search` : "/#search");
}
