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
    seoDescription:
      "Everything White Glove does, on one page: trip planning, flights, hotels, kosher food, phones, insurance, honeymoons, and Jewish heritage journeys.",
    blocks: [
      {
        id: "services-hero",
        kind: "hero",
        eyebrow: "White Glove services",
        heading: "Services",
        intro:
          "Everything we do, in one place. Tell us what matters and we shape the route, the flights, the hotels and the kosher details around it — or use the tools here and plan it yourself.",
      },
      {
        id: "services-planning",
        kind: "cards",
        heading: "Planning a trip",
        intro:
          "The heart of it: you say where you are going and what matters most, and the trip is built around the actual route rather than around a template.",
        items: [
          {
            title: "Route planning",
            body: "Tell us where you are going, what matters most, and how much flexibility you want. We shape the trip around the actual route.",
            href: "/itinerary",
          },
          {
            title: "Flights",
            body: "Air travel kept in step with the rest of the trip — arrival times, departure buffers, and connections that do not strand you.",
            href: "/flight-booking-assistance",
          },
          {
            title: "Hotels",
            body: "Stays that work with your schedule, your kosher needs, and how far you are willing to walk.",
            href: "/book",
          },
          {
            title: "Kosher food",
            body: "Food for the whole journey, including Shabbos, travel days, and whatever the destination does and does not have.",
            href: "/kosher",
          },
          {
            title: "Religious needs",
            body: "Minyanim, mikvaos, tefillos and access notes, kept in the same plan as everything else.",
            href: "/directory",
          },
          {
            title: "Your saved itinerary",
            body: "One place to keep the trip organised, with room for notes, bookings and changes. As many trips as you need.",
            href: "/itinerary",
          },
        ],
      },
      {
        id: "services-more",
        kind: "cards",
        heading: "The rest of what we do",
        items: [
          {
            title: "שתוליכנו לשלום — Jewish heritage journeys",
            body: "Kevarim and nesios across Europe and Asia: who is buried where, how to get in, who holds the key, and what is around it.",
            href: "/stops",
          },
          {
            title: "Honeymoon",
            body: "A quiet, well-planned honeymoon with the kosher details handled from the start.",
            href: "/honeymoon",
          },
          {
            title: "Kosher getaways",
            body: "Shorter trips and programmes, with the food and the davening already worked out.",
            href: "/getaways",
          },
          {
            title: "Phone rentals",
            body: "SIMs, eSIMs and hotspots, so you land with a working phone instead of hunting for one.",
            href: "/phone-rentals",
          },
          {
            title: "Travel insurance",
            body: "What the cover actually includes, said plainly, and where to get it.",
            href: "/travel-insurance",
          },
          {
            title: "Flight booking assistance",
            body: "Send us the details and a person books it, rather than you fighting a booking engine.",
            href: "/flight-booking-assistance",
          },
        ],
      },
      {
        id: "services-cta",
        kind: "buttons",
        items: [
          { label: "Plan it with us", href: "/contact", style: "solid" },
          { label: "Plan it yourself", href: "/itinerary", style: "outline" },
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
    // STILL "getaways" — the slug is the key the owner's stored edits are
    // filed under, and renaming it would throw away whatever he has already
    // written for a page that has only moved address. The page is
    // /vacation-ideas now, and /getaways redirects to it (next.config.ts).
    slug: "getaways",
    href: "/vacation-ideas",
    label: "Vacation Ideas",
    seoTitle: "Kosher vacation ideas — where to go | White Glove Itineraries",
    seoDescription:
      "Beaches, cities, mountains and family trips, with what we hold on record about kosher food and Shabbos in each one.",
    blocks: [
      {
        id: "getaways-hero",
        kind: "hero",
        eyebrow: "Vacation ideas",
        heading: "Where to go, with the kosher side already worked out.",
        intro:
          "Beaches, cities, mountains and family trips. Every destination here says what we hold on record about kosher food and about Shabbos — because those are the two questions that decide whether a holiday is workable, and no other travel site answers them.",
      },
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
