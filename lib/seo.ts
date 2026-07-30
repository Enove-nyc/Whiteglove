import type { Metadata } from "next";

/**
 * Page metadata, in one place.
 *
 * Every page used to inherit the root layout's title and description, so the
 * directory, the cemeteries, Lizhensk, Uman and the booking pages all shared
 * one generic line in search results and one generic card when shared. This
 * builds the per-page set — title, description, canonical URL, Open Graph and
 * Twitter card — from the page's own words, so a page says what it is.
 */

export const SITE_NAME = "White Glove Itineraries";

/**
 * The card image used when a page is shared, unless the page has its own.
 *
 * The logo is a real asset that exists at build time; a missing image is worse
 * than a plain one, because the link then renders with no card at all.
 */
const SOCIAL_IMAGE = { url: "/logo.png", width: 1599, height: 1066, alt: SITE_NAME };

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
  return (
    parseOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    parseOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    parseOrigin(process.env.VERCEL_URL) ??
    undefined
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
