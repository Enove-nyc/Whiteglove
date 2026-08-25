import type { Metadata } from "next";

import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { BRAND_NAME, BRAND_ORIGIN, type SiteBrand } from "@/lib/site-brand-core";

/**
 * Page metadata, in one place.
 *
 * Every page used to inherit the root layout's title and description, so the
 * directory, the cemeteries, Lizhensk, Uman and the booking pages all shared
 * one generic line in search results and one generic card when shared. This
 * builds the per-page set — title, description, canonical URL, Open Graph and
 * Twitter card — from the page's own words, so a page says what it is.
 */

// Both names come from lib/site-brand-core.ts, so the brand a page is served
// as and the brand its metadata claims cannot drift apart.
export const SITE_NAME = BRAND_NAME.kosher;
const ITINERARIES_SITE_NAME = BRAND_NAME.itineraries;

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
const SOCIAL_IMAGE = { url: "/logo-hand-navy.png", width: 355, height: 460 };

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

/**
 * THE CANONICAL URL HAS TO NAME THE BRAND'S OWN DOMAIN, NOT THIS DEPLOYMENT'S.
 *
 * One app answers on two domains. `metadataBase` in the root layout is a
 * single build-time origin — necessarily the kosher one — and a relative
 * canonical resolves against it. So every itineraries page was shipping
 * <link rel="canonical" href="https://www.whiteglovekoshertravel.com/...">:
 * an instruction to Google that the page is a duplicate and the kosher domain
 * is the original. That is the one tag that can keep a whole domain out of the
 * index, and it was on every itineraries page but the home page.
 *
 * A page's brand is already known here — withSiteName reads it off the title
 * to decide openGraph.siteName — so the canonical is built from the same
 * answer. Tab title, share-card site name and canonical host now cannot
 * disagree, because all three come from one decision.
 *
 * A page whose title names no brand still resolves to the kosher origin, which
 * is right twice over: it is the default this site has always had, and a
 * kosher-travel page that happens to be reachable on both domains SHOULD point
 * its canonical at the kosher one. Consolidating a genuine duplicate is what
 * the tag is for. The bug was never that pages pointed somewhere — it was that
 * itineraries pages pointed at the wrong somewhere.
 */
function originForSiteName(siteName: string): string {
  return siteName === ITINERARIES_SITE_NAME ? BRAND_ORIGIN.itineraries : BRAND_ORIGIN.kosher;
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
  /**
   * The brand this page is being served as, when the caller knows it at
   * request time. Overrides whatever the title happens to say — a page that
   * reads currentBrand() should hand in the answer rather than let a stored
   * CMS title decide its canonical domain.
   */
  brand?: SiteBrand;
};

/**
 * The metadata for one page.
 *
 * `path` is the canonical address: the one URL a search engine should treat as
 * this page, whatever query string or redirected alias somebody arrived
 * through. Relative paths are resolved against `metadataBase`, set once in the
 * root layout.
 */
/**
 * The one way a page title ends, so a tab and a search result read as one site.
 *
 * The pages were hand-writing three different endings — "| White Glove Kosher
 * Travel", "— White Glove Kosher Travel" and the short "| White Glove" — so a
 * row of the site's own results in Google looked like three sites. This folds
 * whichever was written down to the one the brand actually is, and adds it to
 * a title that carried none. A page whose whole title IS the brand — the home
 * page — is left alone rather than made "White Glove … | White Glove".
 *
 * TWO BRANDS, NOT ONE. A page already written for the itineraries brand hands
 * in a title ending "… | White Glove Itineraries" — that ending is DETECTED
 * and preserved, never replaced with the kosher name. This was the actual bug:
 * the strip pattern only recognized "White Glove[ Kosher Travel]", so an
 * itineraries title fell all the way through as "not a brand ending yet" and
 * got a SECOND, kosher-branded ending appended after it — every itineraries
 * page whose title looked correctly branded was actually shipping both names
 * at once, live, in the browser tab. Detecting which brand was already there
 * is what stops that: this function never invents a brand, only recognizes
 * the one the caller already wrote and keeps that one.
 */
// DETECTING a brand ending allows no separator at all — "Sign in to White
// Glove Itineraries" carries none, while "Build a proposal — White Glove
// Itineraries" does, and both are real titles written this session. Used to
// decide WHICH brand a title already carries, for openGraph.siteName and to
// know a rewrite is not needed at all.
const ITINERARIES_ANY = /(?:^|[|–—-]\s*|\s)White\s?Glove\s+Itineraries\s*$/i;
const KOSHER_ANY = /(?:^|[|–—-]\s*|\s)White\s?Glove(?:\s+Kosher\s+Travel)?\s*$/i;

// REWRITING only ever touches one of the three separator styles this
// codebase actually used ("|", "-"/"—", or nothing at all but a mismatched
// one of the two). A title with NO separator at all is a natural sentence —
// "Sign in to White Glove Itineraries" — already correct as written, and
// rewriting it would leave a stray "to | White Glove Itineraries" behind.
const ITINERARIES_WITH_SEP = /\s*[|–—-]\s*White\s?Glove\s+Itineraries\s*$/i;
const KOSHER_WITH_SEP = /\s*[|–—-]\s*White\s?Glove(?:\s+Kosher\s+Travel)?\s*$/i;

function detectedSiteName(trimmed: string): string | null {
  if (ITINERARIES_ANY.test(trimmed)) return ITINERARIES_SITE_NAME;
  if (KOSHER_ANY.test(trimmed)) return SITE_NAME;
  return null;
}

export function withSiteName(title: string, siteName: string = SITE_NAME): string {
  const trimmed = title.trim();
  if (trimmed === siteName || trimmed.length === 0) return trimmed || siteName;
  // A brand already sits at the end with no separator — a natural sentence,
  // already correct. Leave it exactly as written; see the note above.
  if (!ITINERARIES_WITH_SEP.test(trimmed) && !KOSHER_WITH_SEP.test(trimmed) && detectedSiteName(trimmed)) {
    return trimmed;
  }
  // Whichever brand the title's separator-style ending already names wins —
  // never replaced with the other brand. Only a title with NEITHER ending
  // falls back to whatever this call passed.
  const effectiveName = detectedSiteName(trimmed) ?? siteName;
  const base = trimmed.replace(ITINERARIES_WITH_SEP, "").replace(KOSHER_WITH_SEP, "").trim();
  return `${base || effectiveName} | ${effectiveName}`;
}

export function pageMetadata({ title, description, path, image, noIndex, brand }: PageMetadata): Metadata {
  const relative = path.startsWith("/") ? path : `/${path}`;
  // The same brand withSiteName settled on decides openGraph.siteName too —
  // a page's tab title and its share-card site name must never disagree. An
  // explicit brand from the caller outranks the title, since the title may be
  // an admin-entered override written for the other brand.
  const siteName = brand ? BRAND_NAME[brand] : detectedSiteName(title.trim()) ?? SITE_NAME;
  // Absolute, so it cannot be resolved against the single build-time
  // metadataBase and land on the wrong domain. See originForSiteName above.
  const canonical = new URL(relative, originForSiteName(siteName)).toString();
  const images = [image ?? { ...SOCIAL_IMAGE, alt: siteName }];
  const fullTitle = withSiteName(title, siteName);
  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName,
      title: fullTitle,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: images.map((item) => item.url),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
