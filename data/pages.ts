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
          "One way, and it is stated where it applies. Booking searches on this site hand off to travel partners who may pay a commission on a booking; that never changes what you pay, and the disclosure sits beside every search rather than only in the footer. Everything else — the planner, the routing, the kosher lookups and the heritage information — is free to use.",
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
  {
    // The legal pages are editable too, but they keep a live default rather
    // than a static one: the built-in page pulls the contact email and the
    // affiliate disclosure from the site words, and renders that until the
    // owner publishes an edit here. So these blocks are the editor's starting
    // point and the fallback — a faithful snapshot of the page as it reads
    // today — while the un-edited page stays wired to the site words. See
    // app/terms/page.tsx and app/privacy/page.tsx.
    slug: "terms",
    href: "/terms",
    label: "Terms of Use",
    seoTitle: "Terms of Use — White Glove Kosher Travel",
    seoDescription: "The terms that govern your use of White Glove Kosher Travel.",
    blocks: [
      { id: "terms-hero", kind: "hero", eyebrow: "White Glove Kosher Travel", heading: "Terms of Use", intro: "Last updated: August 10, 2026\n\nThese Terms of Use govern your access to and use of White Glove Kosher Travel at whiteglovekoshertravel.com (the “Service”). By using the Service, you agree to these terms. If you do not agree, please do not use the Service." },
      { id: "terms-service", kind: "text", heading: "The Service", body: "White Glove provides informational travel guides and planning tools for kosher travel and Jewish heritage journeys, including destination guides, cemetery and access information, saved routes, and flight and hotel search. The Service is provided for personal, non-commercial use." },
      { id: "terms-account", kind: "text", heading: "Your account", body: "Some features require an account. You agree to provide accurate information, to keep your password confidential, and to be responsible for activity that happens under your account. Notify us promptly if you believe your account has been used without your permission." },
      { id: "terms-use", kind: "text", heading: "Acceptable use", body: "You agree not to misuse the Service. In particular, you will not:\n\n- use the Service for any unlawful purpose or in violation of these terms;\n- attempt to access accounts, data, or systems that are not yours;\n- scrape, copy, or redistribute our content in bulk without permission;\n- interfere with or disrupt the Service or the networks it relies on." },
      { id: "terms-verify", kind: "text", heading: "Travel information — please verify", body: "Our guides gather details such as addresses, contacts, minyan and mikvah times, access notes, and safety notices to help your planning. This information can change, and access and travel conditions vary. Please confirm anything critical — access arrangements, hours, and current safety conditions — directly with the relevant contact or authority before you rely on it. White Glove is not responsible for outdated details or for the acts of third parties such as hotels, drivers, or cemetery custodians." },
      { id: "terms-bookings", kind: "text", heading: "Bookings and third-party services", body: "Flight and hotel searches and any bookings are provided through third-party travel partners and are subject to those partners’ own terms, pricing, and cancellation policies. White Glove is not the seller of those travel services and is not a party to your booking.\n\nHow this site is paid. White Glove may earn a commission if you book through a partner link, at no additional cost to you." },
      { id: "terms-ip", kind: "text", heading: "Intellectual property", body: "The Service, including its guides, text, design, and logo, is owned by White Glove Kosher Travel and protected by applicable laws. We grant you a personal, limited, non-transferable right to use the Service for your own travel planning. All other rights are reserved." },
      { id: "terms-disclaimer", kind: "text", heading: "Disclaimer", body: "The Service is provided “as is” and “as available,” without warranties of any kind, whether express or implied, including accuracy, fitness for a particular purpose, or uninterrupted availability. Your use of the Service and reliance on its information is at your own discretion and risk." },
      { id: "terms-liability", kind: "text", heading: "Limitation of liability", body: "To the fullest extent permitted by law, White Glove Kosher Travel will not be liable for any indirect, incidental, or consequential damages, or for any loss arising from your use of the Service, third-party travel services, or reliance on information provided through the Service." },
      { id: "terms-changes", kind: "text", heading: "Changes", body: "We may update the Service and these terms from time to time. When we change these terms, we will revise the “Last updated” date above. Continued use of the Service after changes means you accept the updated terms." },
      { id: "terms-law", kind: "text", heading: "Governing law", body: "These terms are governed by the laws of the State of New York, without regard to its conflict-of-laws rules." },
      { id: "terms-contact", kind: "text", heading: "Contact us", body: "Questions about these terms? Email contact@whiteglovekoshertravel.com." },
    ],
  },
  {
    slug: "privacy",
    href: "/privacy",
    label: "Privacy Policy",
    seoTitle: "Privacy Policy — White Glove Kosher Travel",
    seoDescription: "What White Glove Kosher Travel collects, how it is used, and your choices.",
    blocks: [
      { id: "privacy-hero", kind: "hero", eyebrow: "White Glove Kosher Travel", heading: "Privacy Policy", intro: "Last updated: August 10, 2026\n\nWhite Glove Kosher Travel provides informational travel guides and planning tools for kosher travel and Jewish heritage journeys at whiteglovekoshertravel.com. This policy explains what information we collect, how we use it, and your choices." },
      { id: "privacy-collect", kind: "text", heading: "Information we collect", body: "Account details — your email address and a password. Passwords are stored only in a hashed form; we never store or see your plain password.\n\n- Content you save — the destinations, routes, and favorites you add to your account.\n- Searches and trip details — the cities, flights, and hotels you search for, so we can show relevant results and tools.\n- Usage analytics — aggregate counts such as page visits and popular search terms. These are totals and are not linked to your identity.\n- Cookies — a sign-in cookie that keeps you logged in, and, where enabled, a site-access cookie. We do not use advertising cookies." },
      { id: "privacy-use", kind: "text", heading: "How we use your information", body: "- To create and secure your account and keep you signed in.\n- To send account emails — verification codes and password-reset codes.\n- To provide planning features such as saved routes, favorites, and flight and hotel search.\n- To understand which guides and searches are most useful, so we can improve the site." },
      { id: "privacy-share", kind: "text", heading: "Service providers we share with", body: "- Email delivery — to send verification and password-reset messages.\n- Flight and hotel search — a travel-technology partner processes your travel searches and any booking you choose to make.\n- Hosting and data storage — our website host and database provider store the data described above securely on our behalf." },
      { id: "privacy-keep", kind: "text", heading: "How long we keep it", body: "We keep your account information for as long as your account is active. Verification and reset codes are short-lived and expire automatically. You can ask us to delete your account and its data at any time using the contact details below." },
      { id: "privacy-security", kind: "text", heading: "Security", body: "We protect your information with industry-standard measures: passwords are salted and hashed, sign-in sessions and account codes are cryptographically signed and time-limited, and traffic is served over encrypted connections. No online service can be perfectly secure, but we work to keep your information safe." },
      { id: "privacy-choices", kind: "text", heading: "Your choices", body: "You can review and update your saved content from your account at any time. To access, correct, export, or delete your personal information, email us and we will help. You can also unsubscribe from non-essential emails; account and security emails are required to use the service." },
      { id: "privacy-children", kind: "text", heading: "Children", body: "White Glove is intended for adults planning travel and is not directed to children. We do not knowingly collect information from children." },
      { id: "privacy-changes", kind: "text", heading: "Changes to this policy", body: "We may update this policy from time to time. When we do, we will revise the “Last updated” date above. Significant changes will be noted on this page." },
      { id: "privacy-contact", kind: "text", heading: "Contact us", body: "Questions about this policy or your information? Email contact@whiteglovekoshertravel.com." },
    ],
  },
  {
    // The remaining pages: their listing, tool or custom hero stays in code and
    // is shown by default, so nothing about them changes until the owner edits.
    // Publishing an edit swaps the top of the page for these blocks. That is why
    // a page with a Hebrew title or a live heading can be in the editor without
    // losing its design — the built-in version is what renders until then.
    slug: "stops",
    href: "/stops",
    label: "Towns and guides",
    seoTitle: "Towns and guides | White Glove Kosher Travel",
    seoDescription: "Find a town or kever — search in English or Yiddish.",
    blocks: [{ id: "stops-hero", kind: "hero", eyebrow: "Towns and guides", heading: "Find a town or kever.", intro: "Search in English or Yiddish." }],
  },
  {
    slug: "transfers",
    href: "/transfers",
    label: "Airport transfers",
    seoTitle: "Airport transfers for a kosher trip | White Glove Kosher Travel",
    seoDescription: "Airport transfers booked in advance — often the better answer around Shabbos.",
    blocks: [{ id: "transfers-hero", kind: "hero", eyebrow: "Getting there", heading: "Airport transfers", intro: "Booked in advance, waiting at arrivals. Often the better answer around Shabbos." }],
  },
  {
    slug: "travel-gear",
    href: "/travel-gear",
    label: "Travel gear",
    seoTitle: "Travel gear for a kosher trip | White Glove Kosher Travel",
    seoDescription: "The things worth packing or picking up before a trip.",
    blocks: [{ id: "travel-gear-hero", kind: "hero", eyebrow: "Before you go", heading: "Travel gear", intro: "The things worth packing or picking up before a trip — the same shelf we point to when someone asks what to bring." }],
  },
  {
    slug: "sample-itinerary",
    href: "/sample-itinerary",
    label: "Sample itinerary",
    seoTitle: "A sample kosher itinerary | White Glove Kosher Travel",
    seoDescription: "A week in Rome, as the finished itinerary arrives — a day per page, the kosher side answered.",
    blocks: [{ id: "sample-itinerary-hero", kind: "hero", eyebrow: "What you receive", heading: "A week in Rome, as it arrives.", intro: "A family of five, seven nights, and a Shabbos in the middle of it. This is the document you are handed at the end: a day per page, the walking and driving worked out, and the kosher side answered for each day." }],
  },
  {
    slug: "heritage",
    href: "/heritage",
    label: "Heritage",
    seoTitle: "Jewish heritage — kevarim, batei hachaim and the towns | White Glove Kosher Travel",
    seoDescription: "Who is buried where, how to reach the kever, who holds the key, and what is around it.",
    blocks: [{ id: "heritage-hero", kind: "hero", eyebrow: "Nesiya Tova by White Glove", heading: "Kevarim, batei hachaim, and the towns they are in.", intro: "Who is buried where, how to reach the kever, who holds the key, and what is around it." }],
  },
  {
    slug: "things-to-do",
    href: "/things-to-do",
    label: "Things to do",
    seoTitle: "Things to do on a kosher trip | White Glove Kosher Travel",
    seoDescription: "Attractions and sightseeing suitable for Orthodox travelers, for the days in between.",
    blocks: [{ id: "things-to-do-hero", kind: "hero", eyebrow: "For the days in between", heading: "Things to do", intro: "" }],
  },
  {
    slug: "hotels",
    href: "/hotels",
    label: "Where to stay",
    seoTitle: "Where to stay on a kosher trip | White Glove Kosher Travel",
    seoDescription: "Places to stay for Orthodox and Torah-observant travelers.",
    blocks: [{ id: "hotels-hero", kind: "hero", eyebrow: "Where to stay", heading: "Where to stay", intro: "" }],
  },
  {
    slug: "tzaddikim",
    href: "/tzaddikim",
    label: "Kevarim",
    seoTitle: "Kivrei tzadikim — who is buried where | White Glove Kosher Travel",
    seoDescription: "The kevarim of tzaddikim, and the batei hachaim they are in.",
    blocks: [{ id: "tzaddikim-hero", kind: "hero", eyebrow: "Kevarim", heading: "Who is buried where", intro: "" }],
  },
  {
    slug: "eruvin",
    href: "/eruvin",
    label: "Eruvin",
    seoTitle: "Eruvin — community eruv status for travel | White Glove Kosher Travel",
    seoDescription: "Community eruvin, each linked to its own status page. Always check before you carry.",
    blocks: [{ id: "eruvin-hero", kind: "hero", eyebrow: "Kosher travel", heading: "Eruvin", intro: "An eruv can come down on any Shabbos, sometimes without notice. Each community posts its own status every Erev Shabbos — check it before you carry. These listings link you straight to it." }],
  },
  {
    slug: "hechsherim",
    href: "/hechsherim",
    label: "Hechsherim",
    seoTitle: "Hechsherim — the marks and who is behind them | White Glove Kosher Travel",
    seoDescription: "The certification marks you meet on a listing, and the bodies behind them.",
    blocks: [{ id: "hechsherim-hero", kind: "hero", eyebrow: "Kosher certification", heading: "The marks, and who is behind them", intro: "This page does not say who certifies what and does not rank them. Which to rely on is a question for your rov." }],
  },
  {
    slug: "directory",
    href: "/directory",
    label: "Directory",
    seoTitle: "The White Glove directory | White Glove Kosher Travel",
    seoDescription: "Tour operators, planners, agencies, guides and drivers — by name, region or specialty.",
    blocks: [{ id: "directory-hero", kind: "hero", eyebrow: "White Glove directory", heading: "Find the people who make the trip happen.", intro: "Tour operators, planners, agencies, guides and drivers — by name, region or specialty." }],
  },
  {
    slug: "mikvaos",
    href: "/mikvaos",
    label: "Mikvaos",
    seoTitle: "Mikvaos for Jewish travel | White Glove Kosher Travel",
    seoDescription: "Mikvah listings with addresses, contacts and the source behind each one.",
    blocks: [{ id: "mikvaos-hero", kind: "hero", eyebrow: "Kosher travel", heading: "Mikvaos", intro: "Every listing carries its source. Hours and access change — confirm with the community before you travel." }],
  },
  {
    slug: "cemeteries",
    href: "/cemeteries",
    label: "Cemetery directory",
    seoTitle: "Kivrei Tzadikim and Jewish Cemeteries Directory | White Glove",
    seoDescription: "Every beis hachaim we hold a record for: kevarim, addresses, arrival notes and shomer contacts.",
    blocks: [{ id: "cemeteries-hero", kind: "hero", eyebrow: "Cemetery directory", heading: "Batei hachaim", intro: "Known kevarim, navigation and arrival notes for each beis hachaim." }],
  },
  {
    slug: "shuls",
    href: "/shuls",
    label: "Shuls",
    seoTitle: "Shuls and minyanim for Jewish travel | White Glove Kosher Travel",
    seoDescription: "Shul and minyan listings, with a source behind each one. Confirm times locally before you go.",
    blocks: [{ id: "shuls-hero", kind: "hero", eyebrow: "Kosher", heading: "Shuls", intro: "" }],
  },
  {
    slug: "verification",
    href: "/verification",
    label: "Travel information",
    seoTitle: "Travel information | White Glove Kosher Travel",
    seoDescription: "A practical guide to checking the travel details that can change before your vacation.",
    blocks: [
      { id: "verification-hero", kind: "hero", eyebrow: "Travel information", heading: "A few details are always worth checking twice.", intro: "Confirm hours, certification and Shabbos arrangements directly before you travel." },
      {
        id: "verification-checks",
        kind: "cards",
        heading: "Five things to confirm yourself.",
        intro: "None of these takes long, and each one is the sort of thing that changes between a page being written and a family arriving.",
        items: [
          { title: "Kosher certification", body: "Check the current teudah or the certifying agency directly, especially if a restaurant has recently changed hands." },
          { title: "Hours and reservations", body: "Confirm opening hours, whether you need to book, and yom tov schedules with the business before making the journey." },
          { title: "Shabbos arrangements", body: "Ask the local shul or your host about minyan times, the eruv, mikvah access and anything that needs arranging for your stay." },
          { title: "Entry requirements", body: "Use the official government site for your passport and your destination. Visa and passport rules change." },
          { title: "Routes and transportation", body: "Recheck driving times, public transport and road closures close to your travel date." },
        ],
      },
      { id: "verification-verified", kind: "text", heading: "What “Verified” means here.", body: "A detail marked Verified has been confirmed against the place itself — a call, an email, or the establishment’s own published page — and the date it was confirmed is printed beside it. Whether somewhere is kosher is the certifying body’s statement rather than ours, so every kashrus detail names its source.\n\nAdvertising never touches it. A business cannot buy the label, buy a ranking, or change what a page says about its kashrus." },
      { id: "verification-cta", kind: "buttons", items: [{ label: "Tell us if something here is out of date", href: "/contact?reason=correction" }] },
    ],
  },
  {
    // Hero editable, the tool and cards below it stay in code — the /kosher
    // pattern, for a page that is part prose and part a live component.
    slug: "esim",
    href: "/esim",
    label: "eSIMs and data abroad",
    seoTitle: "eSIMs and data abroad for a kosher trip | White Glove Kosher Travel",
    seoDescription: "What an eSIM is, what to check before you buy one, and where to get a data plan for the country you are going to.",
    blocks: [
      { id: "esim-hero", kind: "hero", eyebrow: "Before you travel", heading: "eSIMs and data abroad", intro: "A data plan on your phone before you fly, instead of roaming." },
    ],
  },
  {
    // Hero editable; the tools-and-doors grid and the gear shelf below stay in
    // code, the same way /kosher keeps its finder.
    slug: "kosher-travel",
    href: "/kosher-travel",
    label: "Kosher travel",
    seoTitle: "Kosher travel — food, Shabbos, minyanim and mikvaos | White Glove Kosher Travel",
    seoDescription: "Kosher food, places to stay, shuls, mikvaos, zmanim and kevarim — the practical side of travelling kosher, in one place.",
    blocks: [
      { id: "kosher-travel-hero", kind: "hero", eyebrow: "Kosher travel", heading: "Practical kosher travel.", intro: "" },
    ],
  },
  {
    slug: "kosher-travel-glossary",
    href: "/kosher-travel/glossary",
    label: "Kosher travel glossary",
    seoTitle: "Kosher travel glossary | White Glove Kosher Travel",
    seoDescription: "What hechsher, eruv, minyan, mikvah, kever and shomer mean on this site.",
    blocks: [
      { id: "glossary-hero", kind: "hero", eyebrow: "Kosher travel", heading: "Glossary", intro: "" },
      { id: "glossary-terms", kind: "text", body: "## Hechsher\n\nThe certification that food is kosher, and the body that gives it. A listing names the body when White Glove has a recorded status.\n\n## Eruv\n\nA boundary around a neighbourhood that allows carrying on Shabbos within it. Where a quarter has one, it changes what a Shabbos there looks like with children.\n\n## Minyan\n\nA quorum for communal prayer. “Walking distance to a minyan” is the single most common request on a trip like this.\n\n## Mikvah\n\nA ritual bath. Availability and hours vary a great deal outside large communities, which is why we say to confirm before travelling.\n\n## Kever / kevarim\n\nA grave, and graves — usually of a tzaddik, a righteous person whose resting place people travel to.\n\n## Shomer\n\nThe person who holds the key to a cemetery or looks after it. Whether you can get in often depends on reaching them." },
    ],
  },
];

export function getPageDef(slug: string): PageDef | undefined {
  return editablePages.find((p) => p.slug === slug);
}
