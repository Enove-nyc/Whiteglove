import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";
import { PRIVATE_PATHS } from "@/lib/site-map";

/**
 * What a crawler may and may not read.
 *
 * THERE WAS NO robots.txt. The address returned the "Destination not found"
 * page, because it fell through to the [city] route and was treated as a town.
 *
 * The disallow list is the SAME list the sitemap refuses to include, from
 * lib/site-map.ts. Two hand-written lists is how a page ends up submitted in
 * one and forbidden in the other, which Google reports as an error against the
 * whole site.
 *
 * NOT A SECURITY MEASURE, and it must not be mistaken for one. robots.txt is a
 * request that well-behaved crawlers honour; it is also a public list of where
 * the interesting things are. Everything under /admin and /account is behind a
 * real check of its own, and would be with or without this file.
 */
/**
 * Both lines a private address needs.
 *
 * A TRAILING SLASH ALONE IS NOT ENOUGH, and this is easy to get wrong: robots.txt
 * matches on prefix, so `Disallow: /admin/` covers /admin/settings and leaves
 * `/admin` ITSELF crawlable. Dropping the slash instead over-corrects — a bare
 * `Disallow: /account` would also block a future /accountants, which
 * isPrivatePath deliberately treats as public.
 *
 * So: `$` for the address exactly, and the slash for everything beneath it.
 * That is the same whole-segment rule isPrivatePath applies, said in the syntax
 * robots.txt has for it.
 */
function disallowFor(path: string): string[] {
  if (path.endsWith("/")) return [path];
  return [`${path}$`, `${path}/`];
}

/**
 * Crawlers that are asked not to come back.
 *
 * NOT A JUDGEMENT ON THEM, A BILL. Over seven days this site answered 43,851
 * requests, nearly all of them crawlers working through the 809 addresses in
 * the sitemap, around the clock. Every one wakes a database that bills for
 * being awake. The ones below were the loudest in the logs and send no readers
 * in return: two short-video scrapers and two link-graph bots.
 *
 * WHO IS DELIBERATELY NOT HERE. Google, Bing and Applebot bring readers.
 * OpenAI's and Anthropic's bring the answers people now ask instead of
 * searching, and a kosher guide that is invisible to those is invisible to the
 * next generation of travellers. Semrush and Ahrefs are left alone because
 * they are the owner's own tools when he wants them, and turning off a tool
 * you use to save a few pennies is a bad trade.
 *
 * AND IT IS A REQUEST, NOT A WALL. robots.txt is honoured by the well-behaved
 * and ignored by the rest; the crawlers below do generally honour it. Anything
 * that does not is a job for Cloudflare, not for this file.
 */
const NO_READERS_IN_RETURN = ["Bytespider", "TikTokSpider", "DotBot", "Amazonbot"] as const;

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS.flatMap(disallowFor),
      },
      ...NO_READERS_IN_RETURN.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    // Only when there is a real address. A relative sitemap line is invalid and
    // would make the whole file suspect.
    ...(origin ? { sitemap: new URL("/sitemap.xml", origin).toString(), host: origin.host } : {}),
  };
}
