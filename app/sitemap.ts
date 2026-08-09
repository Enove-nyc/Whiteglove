import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
import { publicPaths } from "@/lib/site-map";

/**
 * The list of this site's pages, for search engines.
 *
 * THERE WAS NOT ONE. /sitemap.xml fell through to the [city] route and returned
 * the "Destination not found" page, so Google had no list of the three
 * hundred-odd towns, batei hachaim, tzaddikim and guides here — every one had
 * to be stumbled across from a link.
 *
 * `lastModified` IS THE BUILD, and that is the honest answer available. A date
 * per page would need a real "when did this change" on every record, and there
 * is not one; putting today's date on all of them instead would tell a crawler
 * the whole site changed every morning, which is worse than saying nothing.
 * A deploy is a genuine moment at which any of these could have changed.
 *
 * With no site address configured this returns nothing rather than a list of
 * relative URLs. A sitemap of paths without a host is not a sitemap — every
 * line would be rejected — and an empty one at least fails visibly.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin) return [];
  const lastModified = new Date();

  return publicPaths().map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, origin).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
