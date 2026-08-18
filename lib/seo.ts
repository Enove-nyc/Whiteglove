import type { Metadata } from "next";

import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";

/**
 * Page metadata, in one place.
 *
 * Every page used to inherit the root layout's title and description, so the
 * directory, the cemeteries, Lizhensk, Uman and the booking pages all shared
 * one generic line in search results and one generic card when shared. This
 * builds the per-page set — title, description, canonical URL, Open Graph and
 * Twitter card — from the page's own words, so a page says what it is.
 */

export const SITE_NAME = "White Glove Kosher Travel";

export { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
const CANONICAL_HOST = new URL(CANONICAL_ORIGIN).hostname;
const CANONICAL_APEX = CANONICAL_HOST.replace(/^www\./, "");

/**
 * The card image used when a page is shared, unless the page has its own.
 *
 * The logo is a real asset that exists at build time; a missing image is worse
 * than a plain one, because the link then renders with no card at all.
 */
/**
 * The picture that appears when somebody shares this site.
 *
 * NOT /logo.png. That artwork has "White Glove Itineraries" — the old company
 * name — drawn into it, so every share, every message, every preview card was
 * showing a name this business no longer uses. The mark carries no words at
 * all, which is worse than a wordmark and far better than the wrong one.
 */
const SOCIAL_IMAGE = { url: "/logo-hand-navy.png", width: 355, height: 460, alt: SITE_NAME };

function parseOrigin(raw?: string | null): URL | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    // An unparseable address tells us nothing. Fall through to the next
    // candidate rather than throwing during a build.
    return null;
  }
}

/**
 * Where this deployment lives, for canonical links and absolute card images.
 *
 * `NEXT_PUBLIC_SITE_URL` is the address the site already considers its own —
 * shared itinerary links and emails use it — so it wins. Vercel's own
 * variables cover a deployment where it has not been set: the production
 * domain first, then the per-deployment URL for previews. With none of them
 * set, Next.js falls back to localhost, which is right for local development
 * and is why nothing is hardcoded here.
 */
export function siteOrigin(): URL | undefined {
  return canonicalise(
    parseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
      parseOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
      parseOrigin(process.env.VERCEL_URL) ??
      null,
  );
}

/**
 * The live domain, written the one way the site is actually served.
 *
 * NEXT_PUBLIC_SITE_URL is set to the bare domain, and it is one value in a
 * dashboard that feeds canonical tags, the sitemap, robots.txt, share links,
 * the address emails link back to and where sign-in returns somebody. Correct
 * it here rather than there and it cannot drift back the next time the
 * variable is copied between deployments — and every one of those follows.
 *
 * ONLY THIS DOMAIN IS TOUCHED. A preview deployment on vercel.app, a Railway
 * host and localhost do not match the apex and come through unchanged, so
 * development and previews still describe themselves as where they really are.
 */
function canonicalise(origin: URL | null): URL | undefined {
  if (!origin) return undefined;
  if (origin.hostname.toLowerCase().replace(/^www\./, "") !== CANONICAL_APEX) return origin;
  const fixed = new URL(origin.toString());
  fixed.protocol = "https:";
  fixed.hostname = CANONICAL_HOST;
  fixed.port = "";
  return fixed;
}

/**
 * Say so, once, at build time, if there is no address to be canonical about.
 *
 * This is worth shouting about because the failure is silent and permanent.
 * Statically generated pages — every city guide, every beis hachaim — resolve
 * their canonical URL and their share image AT BUILD TIME. Build without an
 * address and they ship with a relative canonical and an og:image pointing at
 * localhost, so every share of a guide renders with no picture, and two
 * domains serving the same content never consolidate. Nothing at runtime can
 * repair it; it takes another build.
 *
 * The warning lands in the deployment's build log, which is where somebody
 * looking for why the share cards are broken would actually look.
 */
if (process.env.NODE_ENV === "production" && !siteOrigin()) {
  console.warn(
    "[seo] No site address is set, so canonical URLs and social-card images cannot be made absolute.\n" +
      `      Set NEXT_PUBLIC_SITE_URL (e.g. ${CANONICAL_ORIGIN}) and deploy again.\n` +
      "      Pages built now will ship with a relative canonical and a localhost share image.",
  );
}

export type PageMetadata = {
  /** Shown in the tab, the search result and the share card. */
  title: string;
  description: string;
  /** The page's own address, e.g. "/book". Becomes the canonical URL. */
  path: string;
  /** A page-specific share image, if there is a real one. */
  image?: { url: string; width?: number; height?: number; alt?: string };
  /** Set for pages that should exist but not be indexed. */
  noIndex?: boolean;
};

/**
 * The metadata for one page.
 *
 * `path` is the canonical address: the one URL a search engine should treat as
 * this page, whatever query string or redirected alias somebody arrived
 * through. Relative paths are resolved against `metadataBase`, set once in the
 * root layout.
 */
export function pageMetadata({ title, description, path, image, noIndex }: PageMetadata): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const images = [image ?? SOCIAL_IMAGE];
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((item) => item.url),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
