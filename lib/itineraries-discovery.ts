import { BRAND_CONTACT_EMAIL, BRAND_NAME, BRAND_ORIGIN } from "@/lib/site-brand-core";

export const ITINERARIES_TITLE = "Travel Itinerary Planner | White Glove Itineraries";
export const ITINERARIES_DESCRIPTION = "Build a day-by-day travel itinerary with flights, hotels and activities. Start from scratch or copy a sample trip, then print it or save it as a PDF.";

/** Public product facts only; never read sessions, trip stores or customer documents. */
export function itinerariesStructuredData() {
  const origin = BRAND_ORIGIN.itineraries;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: BRAND_NAME.itineraries,
        url: `${origin}/`,
        email: BRAND_CONTACT_EMAIL.itineraries,
        description: ITINERARIES_DESCRIPTION,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: BRAND_CONTACT_EMAIL.itineraries,
          url: `${origin}/contact`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: BRAND_NAME.itineraries,
        url: `${origin}/`,
        description: ITINERARIES_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
