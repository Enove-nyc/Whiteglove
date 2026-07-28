// Every public page the owner can edit, and what it says today.
//
// Each entry carries the page's built-in content as a list of blocks. That is
// the page as it ships: with no database, an unreachable one, or a page never
// edited, this is exactly what a visitor sees. An edit is stored as an override
// and only replaces this once it is published, so nothing here is ever lost and
// undoing an edit is deleting a row.
//
// Adding a page to this list is what makes it editable. See
// docs/pages-migration.md.

import type { PageBlock } from "@/data/page-blocks";

export type PageDef = {
  slug: string;
  /** The page's address, for the admin list and the "view live" link. */
  href: string;
  /** Human name in the admin list. */
  label: string;
  /** What a search engine shows, unless the owner overrides it. */
  seoTitle: string;
  seoDescription: string;
  /** The page as it ships. */
  blocks: PageBlock[];
};

export const editablePages: PageDef[] = [
  {
    slug: "services",
    href: "/services",
    label: "Services",
    seoTitle: "Services — White Glove Itineraries",
    seoDescription: "This hub gathers the service pages that sit alongside the destination directory and itinerary tools.",
    blocks: [
    { id: "services-hero", kind: "hero", eyebrow: "White Glove services", heading: "Services", intro: "This hub gathers the service pages that sit alongside the destination directory and itinerary tools." },
    {
      id: "services-cards",
      kind: "cards",
      heading: "What we help with",
      items: [
        { title: "Planning", body: "Personalized trip planning and route guidance." },
        { title: "Honeymoon", body: "A premium honeymoon planning landing page." },
        { title: "Phone Rentals", body: "SIM, eSIM, and hotspot support for travel." },
        { title: "Travel Insurance", body: "Explain coverage and referral options clearly." },
        { title: "Flight Booking Assistance", body: "Collect details for a human-assisted flight booking request." },
      ],
    },
    ],
  },
  {
    slug: "planning",
    href: "/planning",
    label: "Planning",
    seoTitle: "Your Route Traveler — White Glove Itineraries",
    seoDescription: "This page is the start of the personalized planning service. Travelers can describe what they need, and White Glove can shape the route, hotels, fligh",
    blocks: [
    { id: "planning-hero", kind: "hero", eyebrow: "White Glove concierge", heading: "Your Route Traveler", intro: "This page is the start of the personalized planning service. Travelers can describe what they need, and White Glove can shape the route, hotels, flights, and practical details around that trip." },
    {
      id: "planning-cards",
      kind: "cards",
      heading: "What planning covers",
      items: [
        { title: "Route planning", body: "Tell us where you are going, what matters most, and how much flexibility you want. We’ll shape the trip around the actual route." },
        { title: "Flights", body: "Keep air travel aligned with the rest of the trip, including arrival times, departure buffers, and connection details." },
        { title: "Hotels", body: "Choose stays that work with your schedule, kosher needs, and walking or transport preferences." },
        { title: "Kosher food", body: "Food planning for the whole journey, including Shabbos, travel days, and destination-specific arrangements." },
        { title: "Religious needs", body: "Minyanim, mikvaos, tefillos, and access notes all kept in the same trip plan." },
        { title: "Saved itinerary", body: "A single place to keep the trip organized, with room for notes, bookings, and future edits." },
      ],
    },
    ],
  },
  {
    slug: "honeymoon",
    href: "/honeymoon",
    label: "Honeymoon",
    seoTitle: "Honeymoon — White Glove Itineraries",
    seoDescription: "We are building this page as a premium honeymoon planning service for kosher travelers. It is being developed carefully so the final version feels cal",
    blocks: [
    { id: "honeymoon-hero", kind: "hero", eyebrow: "White Glove special service", heading: "Honeymoon", intro: "We are building this page as a premium honeymoon planning service for kosher travelers. It is being developed carefully so the final version feels calm, private, and practical." },
    {
      id: "honeymoon-cards",
      kind: "cards",
      heading: "What is included",
      items: [
        { title: "Kosher honeymoon destinations", body: "Romantic trips in Europe and beyond, with kosher food and practical travel details built in from the start." },
        { title: "Romantic accommodations", body: "Private rooms, suites, and boutique stays that fit a quiet, well-planned honeymoon." },
        { title: "Kosher dining", body: "Restaurant planning, catered meals, and Shabbos-friendly food options wherever you go." },
        { title: "Private experiences", body: "Thoughtful outings and memorable moments without losing the structure and standards you need." },
        { title: "Sample itineraries", body: "1-day, 3-day, and longer honeymoon plans that can be adapted around flights and accommodations." },
        { title: "Request a quote", body: "Send us your dates and preferences, and we can shape a honeymoon plan around your needs." },
      ],
    },
    ],
  },
  {
    slug: "getaways",
    href: "/getaways",
    label: "Getaways",
    seoTitle: "Vacations and getaways, planned kosher. — White Glove Itineraries",
    seoDescription: "Beyond kevarim and nesios, White Glove plans the trips you take to unwind — resorts, beaches, mountains, and cities like Rome and Paris — with kosher ",
    blocks: [
    { id: "getaways-hero", kind: "hero", eyebrow: "Kosher getaways", heading: "Vacations and getaways, planned kosher.", intro: "Beyond kevarim and nesios, White Glove plans the trips you take to unwind — resorts, beaches, mountains, and cities like Rome and Paris — with kosher food, Shabbos, and every detail arranged." },
    ],
  },
  {
    slug: "phone-rentals",
    href: "/phone-rentals",
    label: "Phone Rentals",
    seoTitle: "Phone Rentals — White Glove Itineraries",
    seoDescription: "This page covers the future SIM, eSIM, hotspot, and phone rental offering so travelers can stay reachable without juggling setup details.",
    blocks: [
    { id: "phone-rentals-hero", kind: "hero", eyebrow: "Future service", heading: "Phone Rentals", intro: "This page covers the future SIM, eSIM, hotspot, and phone rental offering so travelers can stay reachable without juggling setup details." },
    {
      id: "phone-rentals-cards",
      kind: "cards",
      heading: "What we arrange",
      items: [
        { title: "SIM cards", body: "Country-specific connectivity for travelers who want a simple local solution." },
        { title: "eSIMs", body: "Digital setup for phones that support it, without needing a physical card." },
        { title: "International rentals", body: "Short-term phone rentals for travelers who need a backup device." },
        { title: "Wi-Fi hotspot rentals", body: "Portable internet for family trips, groups, or locations with limited access." },
      ],
    },
    ],
  },
  {
    slug: "travel-insurance",
    href: "/travel-insurance",
    label: "Travel Insurance",
    seoTitle: "Travel Insurance — White Glove Itineraries",
    seoDescription: "This page introduces the future travel insurance referral or guidance page. It is designed to explain the coverage types without pretending to be the ",
    blocks: [
    { id: "travel-insurance-hero", kind: "hero", eyebrow: "Future service", heading: "Travel Insurance", intro: "This page introduces the future travel insurance referral or guidance page. It is designed to explain the coverage types without pretending to be the insurer." },
    {
      id: "travel-insurance-cards",
      kind: "cards",
      heading: "What cover usually includes",
      items: [
        { title: "Trip cancellation", body: "Protects pre-paid parts of the trip when plans change." },
        { title: "Medical coverage", body: "Useful for illness, injury, or urgent assistance abroad." },
        { title: "Baggage coverage", body: "Helps if luggage is delayed, lost, or damaged." },
        { title: "Emergency assistance", body: "24/7 support if something unexpected happens during travel." },
      ],
    },
    ],
  },
  {
    slug: "flight-booking-assistance",
    href: "/flight-booking-assistance",
    label: "Flight Booking Assistance",
    seoTitle: "Flight Booking Assistance — White Glove Itineraries",
    seoDescription: "This page is for travelers who want a person to help gather the flight details and request a booking on their behalf.",
    blocks: [
    { id: "flight-booking-assistance-hero", kind: "hero", eyebrow: "Future service", heading: "Flight Booking Assistance", intro: "This page is for travelers who want a person to help gather the flight details and request a booking on their behalf." },
    {
      id: "flight-booking-assistance-list",
      kind: "list",
      heading: "What to send us",
      items: [
        "Origin and destination",
        "Dates",
        "Traveler count",
        "Cabin preference",
        "Baggage needs",
        "Budget",
      ],
    },
    ],
  },
  {
    slug: "contact",
    href: "/contact",
    label: "Contact",
    seoTitle: "Contact — White Glove Itineraries",
    seoDescription: "Get in touch with White Glove Itineraries about kosher travel, kevarim, and trip planning.",
    blocks: [
    { id: "contact-hero", kind: "hero", eyebrow: "White Glove Itineraries", heading: "Contact", intro: "Tell us about your trip — kevarim, dates, and kosher needs — and we'll be in touch." },
    ],
  },
  {
    slug: "kosher",
    href: "/kosher",
    label: "Kosher food finder",
    seoTitle: "Kosher food finder — White Glove Itineraries",
    seoDescription: "Find kosher restaurants, bakeries, and groceries anywhere in the world — live from OpenStreetMap — and add them straight to your trip.",
    blocks: [
    { id: "kosher-hero", kind: "hero", eyebrow: "Kosher food", heading: "Find kosher food anywhere.", intro: "Live kosher restaurants, bakeries and groceries from OpenStreetMap, anywhere in the world — and you can add any of them straight to your trip." },
    ],
  },
  {
    slug: "submit",
    href: "/submit",
    label: "Submit an entry",
    seoTitle: "Submit an entry — White Glove Itineraries",
    seoDescription: "Send in a kever, cemetery, provider, or correction for the White Glove directory.",
    blocks: [
    { id: "submit-hero", kind: "hero", eyebrow: "Help us get it right", heading: "Send in a kever, cemetery, or provider.", intro: "If you know a place we are missing, or something on the site is wrong, tell us. Every submission is read before anything changes." },
    ],
  },
];

export function getPageDef(slug: string): PageDef | undefined {
  return editablePages.find((p) => p.slug === slug);
}
