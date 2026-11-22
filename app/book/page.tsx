import { permanentRedirect } from "next/navigation";
import { searchHref, tabFromType, SEARCH_LINK_KEYS } from "@/lib/travel-tabs";

/**
 * /book is gone; the booking search is on the home page (owner, 20 November
 * 2026: "I want the /book page to go, everything should be on the main page").
 *
 * Old links — the planner's "Book the flights", bookmarks, search results —
 * still arrive here: ?type=cars opens /find/car-rentals with the dates and
 * places filled, and anything else opens the home page's search.
 */
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (key: string) => { const v = params[key]; return (Array.isArray(v) ? v[0] : v) || undefined; };
  const tab = tabFromType(first("type") ?? (first("kind") === "cars" ? "cars" : undefined));
  // A typed link opens that search's own page, which works on a phone too.
  if (tab) permanentRedirect(searchHref(tab, Object.fromEntries(SEARCH_LINK_KEYS.map((k) => [k, first(k)]))));
  permanentRedirect("/#search");
}
