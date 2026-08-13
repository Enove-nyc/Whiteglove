import { SITE_NAME, siteOrigin } from "@/lib/seo";

/**
 * Structured data — the machine-readable version of what a page says.
 *
 * A search engine reading "Lizhensk" has no way to know it is a place, that
 * it is in Poland, that it has coordinates, or where it sits in the site,
 * unless the page says so in a form built for being read by a machine. This
 * builds that form.
 *
 * Everything here describes what is genuinely on the page. Nothing is
 * invented to fill a field: an absent coordinate is an absent coordinate, and
 * marking up something the page does not actually contain is how a site gets
 * its rich results taken away.
 */

type Json = Record<string, unknown>;

function absolute(path: string): string {
  const origin = siteOrigin();
  const clean = path.startsWith("/") ? path : `/${path}`;
  return origin ? new URL(clean, origin).toString() : clean;
}

/**
 * The trail from the front page to here.
 *
 * Give it the crumbs in order, last one being the page itself. Search results
 * show this instead of a bare URL, which is the difference between
 * "whitegloveitineraries.com › cemeteries › lizhensk" and a naked link.
 */
export function breadcrumbs(trail: Array<{ name: string; path: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

function geo(coordinates?: string | null): Json | undefined {
  const match = coordinates?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  return { "@type": "GeoCoordinates", latitude: Number(match[1]), longitude: Number(match[2]) };
}

export type PlaceInput = {
  name: string;
  description: string;
  path: string;
  /** Free-text address as it is printed on the page. */
  address?: string | null;
  coordinates?: string | null;
  country?: string;
  /** Anything else the place is known as, including its Yiddish name. */
  alternateNames?: Array<string | undefined>;
};

/**
 * A place somebody travels to.
 *
 * `TouristAttraction` rather than the bare `Place`: these are destinations
 * people plan trips around, which is exactly what the type is for, and it is
 * the one that carries through to travel-shaped results.
 */
export function touristAttraction(place: PlaceInput): Json {
  const names = (place.alternateNames ?? []).filter((n): n is string => Boolean(n?.trim()));
  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name,
    description: place.description,
    url: absolute(place.path),
    ...(names.length ? { alternateName: names } : {}),
    ...(place.address
      ? { address: { "@type": "PostalAddress", streetAddress: place.address, ...(place.country ? { addressCountry: place.country } : {}) } }
      : place.country
        ? { address: { "@type": "PostalAddress", addressCountry: place.country } }
        : {}),
    ...(geo(place.coordinates) ? { geo: geo(place.coordinates) } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absolute("/") },
  };
}

/**
 * A beis hachaim. `Cemetery` is a real schema.org type and the honest one —
 * calling it a tourist attraction would be both wrong and tasteless.
 */
export function cemeteryPlace(place: PlaceInput): Json {
  return { ...touristAttraction(place), "@type": "Cemetery" };
}

/** A directory page: what it lists, and how many. */
export function collectionPage(input: { name: string; description: string; path: string; count?: number }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absolute(input.path),
    ...(input.count ? { mainEntity: { "@type": "ItemList", numberOfItems: input.count } } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absolute("/") },
  };
}

/**
 * Questions a page actually answers, in the form a search engine reads.
 *
 * The rule from the top of this file applies with unusual force here: every
 * question must be answered in the visible text of the page, in words a
 * visitor can read. Marking up an answer the page does not give is how a site
 * loses its rich results, so callers pass the same strings they render.
 */
export function faqPage(questions: Array<{ question: string; answer: string }>): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

/** The site itself, declared once on the front page. */
export function website(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absolute("/"),
    description: "Kosher travel and Jewish heritage journeys — kevarim, kosher food, minyanim, and trip planning.",
  };
}
