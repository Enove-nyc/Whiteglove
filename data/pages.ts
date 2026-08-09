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
    seoTitle: "Travel services — planning, booking, kosher and Shabbos | White Glove",
    seoDescription:
      "Six services, each saying who it is for, what is included, how it works, what you end up with and what to expect about price.",
    blocks: [
      {
        id: "services-hero",
        kind: "hero",
        eyebrow: "Travel services",
        heading: "What we actually do for you.",
        // The sentence, and nothing after it. The clause explaining WHY the
        // page mentions price was arguing with an objection the reader had not
        // made — and the page proves the point by doing it, six times over.
        intro:
          "See who each service is for, what it includes, how it works, what you receive, and what to expect about pricing.",
      },
      {
        id: "services-note",
        kind: "note",
        body:
          "Everything on this site is free to use — the planner, the route timing, the kosher lookups, the heritage database. The services below are for when you would rather somebody else did the work.",
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
    href: "/destinations",
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
    seoTitle: "Tell us about the trip you want to take — White Glove Itineraries",
    seoDescription:
      "Vacations, family trips, honeymoons, group travel and Jewish heritage journeys. Tell us what you have in mind — or ask us to help you choose.",
    blocks: [
      {
        id: "contact-hero",
        kind: "hero",
        eyebrow: "Start a conversation",
        // Was: "Tell us about your trip — kevarim, dates, and kosher needs".
        // That sentence asked every visitor, including a family asking about a
        // week in the Dolomites, which graves they wanted to visit. The
        // kevarim question is still asked — of somebody who has said they are
        // planning a heritage journey, and of nobody else.
        heading: "Tell us about the trip you want to take.",
        intro:
          "Wherever you are going, and whether or not you have decided yet. Answer what you know, leave the rest, and we will come back to you.",
      },
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
