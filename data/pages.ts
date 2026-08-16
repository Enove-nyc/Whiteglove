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
    // STILL "getaways" — the slug is the key the owner's stored edits are
    // filed under, and renaming it would throw away whatever he has already
    // written for a page that has only moved address. The page is
    // /vacation-ideas now, and /getaways redirects to it (next.config.ts).
    slug: "getaways",
    href: "/destinations",
    label: "Vacation Ideas",
    seoTitle: "Kosher vacation ideas — where to go | White Glove Kosher Travel",
    seoDescription:
      "Beaches, cities, mountains and family trips, with practical kosher food and Shabbos guidance for each one.",
    blocks: [
      {
        id: "getaways-hero",
        kind: "hero",
        // Was an eyebrow, "Where to go, with the kosher side answered first."
        // and a four-line paragraph, all of it above a page whose own heading
        // then said "Destinations" again. The list is what somebody came for.
        eyebrow: "",
        heading: "Destinations",
        intro: "",
      },
    ],
  },
  {
    slug: "travel-insurance",
    href: "/travel-insurance",
    label: "Travel Insurance",
    seoTitle: "Travel Insurance — White Glove Kosher Travel",
    seoDescription: "What travel insurance usually covers, what to check before you buy, and where to compare policies for your dates.",
    blocks: [
    { id: "travel-insurance-hero", kind: "hero", eyebrow: "Before you travel", heading: "Travel insurance", intro: "What a policy usually covers, and what to read before you buy one. We are not the insurer and we do not advise on cover — the terms, the price and the exclusions are theirs." },
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
    seoTitle: "Flight Booking Assistance — White Glove Kosher Travel",
    seoDescription: "This page is for travelers who want a person to help gather the flight details and request a booking on their behalf.",
    blocks: [
    { id: "flight-booking-assistance-hero", kind: "hero", eyebrow: "Ask a person", heading: "Flight booking assistance", intro: "For a journey that does not fit a search box — a group, a complicated routing, or a date somebody wants a second opinion on. Send what you have and a person picks it up." },
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
    /**
     * WHO IS BEHIND THIS, which the site could not answer.
     *
     * It said what White Glove does on nine pages and never once said who was
     * doing it, where they were, or why a stranger should trust them with the
     * kosher side of a family holiday. That is a fair question and the absence
     * of an answer is its own answer.
     *
     * WHAT THIS PAGE SHIPS WITH, and the line it does not cross. Everything in
     * these blocks is true of the site as it stands and can be checked against
     * it: how the practical detail is produced, what the completeness bar is,
     * how the business is paid, what it will not do. What it does NOT do is
     * invent a founder, a city, a number of years or a client count — an
     * about page whose credentials are made up is worse than no about page on
     * a site whose whole argument is that what it prints has been checked.
     *
     * The personal half — names, background, where the business is based — is
     * the owner's to write, and this is an editable page so he can write it
     * without a deploy: /admin/pages, "About".
     */
    slug: "about",
    href: "/about",
    label: "About",
    seoTitle: "About White Glove Kosher Travel — who we are and how we work",
    seoDescription:
      "Who is behind White Glove Kosher Travel, how the kosher, Shabbos and practical detail on this site is put together, how the business is paid, and how to reach a person.",
    blocks: [
      {
        id: "about-hero",
        kind: "hero",
        // Kept for /admin/pages continuity; the public About page renders the
        // structured profile instead and skips this block so empty personal
        // fields can hide cleanly.
        eyebrow: "About White Glove",
        heading: "Travel information you can plan around.",
        intro:
          "White Glove Kosher Travel is built around the questions that decide a Jewish family's trip. Where the kosher food is, and who stands behind it. Which quarter keeps you within walking distance on Shabbos. How long the drive between two places really takes, and what Friday afternoon looks like when the clock is against you.",
        hidden: true,
      },
      {
        id: "about-why",
        kind: "text",
        heading: "Why it exists",
        body:
          "Most travel sites can tell you what a hotel costs. Few can tell you whether you can walk to a minyan from it on Shabbos, what there is to eat in the town on a Tuesday night, or which quarter to book in so the two are the same walk. That gap is what this site is for: the practical religious side answered first, and the ordinary holiday planning built on top of it.",
      },
      {
        id: "about-how",
        kind: "list",
        heading: "How the detail on this site is put together",
        items: [
          "Practical claims on destination, stay and heritage pages come from a record with a named source. Where the source is a person — a shomer, a rov, a kehilla office — the page says so.",
          "A destination reaches the published vacation list only once it can answer five questions: kosher food, Shabbos, somewhere to stay, something to do, and how you get there and around. A destination that cannot answer all five is not offered as one on that list.",
          "The kosher food finder contains White Glove's curated listings. Confirm current supervision directly before you go.",
          "Where we show driving times from our routing, they are road times rather than straight lines, because a plan built on straight lines falls apart on the second day.",
          "Where something changes — a seasonal programme, a border, access to a bais hachaim — we aim to say when the detail was last checked and where it came from.",
        ],
      },
      {
        id: "about-paid",
        kind: "text",
        heading: "How the business is paid",
        body:
          "Two ways, and both are stated where they apply. Booking searches on this site hand off to travel partners who may pay a commission on a booking; that never changes what you pay, and the disclosure sits beside every search rather than only in the footer. Separately, we are paid to plan trips — that work is quoted before any of it starts, and the planner, the routing, the kosher lookups and the heritage database stay free whether or not you ever hire us.",
      },
      {
        id: "about-not",
        kind: "list",
        heading: "What we will not do",
        items: [
          "Give a hechsher. We tell you what is listed, who certifies it where that is known, and what to ask for. The decision is yours and your rov's.",
          "Claim a rate is the lowest anywhere. We open a search with partners we work with; we do not read the whole market.",
          "Print a detail we cannot attribute. A gap that names itself is worth more than a plausible sentence.",
          "Invent a review. Case studies appear only when a real trip outcome is complete, permitted and approved — never as filler.",
        ],
      },
    ],
  },
  {
    slug: "contact",
    href: "/contact",
    label: "Contact",
    seoTitle: "Contact — White Glove Kosher Travel",
    seoDescription:
      "Tell us something on the site is wrong, ask about advertising, or ask a question.",
    blocks: [
      {
        id: "contact-hero",
        kind: "hero",
        // Was: "Tell us about your trip — kevarim, dates, and kosher needs",
        // then "Tell us about the trip you want to take.", then "Get in
        // touch." with an eyebrow and an intro. The page is the heading, the
        // reason choices and the form — nothing else to read first.
        eyebrow: "",
        heading: "Contact",
        intro: "",
      },
    ],
  },
  {
    slug: "kosher",
    href: "/kosher",
    label: "Kosher food finder",
    seoTitle: "Kosher food finder — White Glove Kosher Travel",
    seoDescription: "Browse White Glove's curated kosher restaurants, bakeries and groceries, then add a listing to your trip.",
    blocks: [
    { id: "kosher-hero", kind: "hero", eyebrow: "Kosher food", heading: "Find kosher food for your trip.", intro: "Browse White Glove's curated kosher restaurants, bakeries and groceries, then add a listing to your trip." },
    ],
  },
  {
    slug: "submit",
    href: "/submit",
    label: "Submit an entry",
    seoTitle: "Submit an entry — White Glove Kosher Travel",
    seoDescription: "Send in a kever, cemetery, provider, or correction for the White Glove directory.",
    blocks: [
    { id: "submit-hero", kind: "hero", eyebrow: "Help us get it right", heading: "Send in a kever, cemetery, or provider.", intro: "If you know a place we are missing, or something on the site is wrong, tell us. Every submission is read before anything changes." },
    ],
  },
];

export function getPageDef(slug: string): PageDef | undefined {
  return editablePages.find((p) => p.slug === slug);
}
