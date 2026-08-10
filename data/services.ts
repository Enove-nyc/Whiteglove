// What White Glove does, said the same way six times.
//
// THE SERVICES PAGE WAS TWO ROWS OF CARDS with a title and a line each —
// "Route planning", "Flights", "Hotels" — and a visitor could read all twelve
// without learning who any of them was for, what arrives at the end, or what
// it costs. That is not a services page; it is a table of contents.
//
// So each service answers the same six questions, in the same order, and the
// page renders them from this list rather than from prose. The order is the
// order somebody evaluates a service in: is this me, what do I get, how does
// it work, what do I end up holding, what do I do now, and what will it cost.
//
// ABOUT THE LAST ONE. There is no price list on this site and this file does
// not invent one. Every entry says plainly what to expect — a quote after we
// understand the trip, or free, or paid to somebody else — because "contact us
// for pricing" with nothing beside it is how a premium site reads as one that
// is hiding something. Where a service is not open yet, that is said too:
// lib/features.ts holds the switch and the page reads it.

export type Service = {
  id: string;
  title: string;
  /** One line under the heading. */
  summary: string;
  /** Who it is for, as a sentence starting "You…". */
  who: string;
  /** What is included. Concrete things, not adjectives. */
  included: readonly string[];
  /** How it works, step by step. */
  process: readonly string[];
  /** What the customer ends up holding. */
  receive: readonly string[];
  /** The next action, and where it goes. */
  action: { label: string; href: string };
  /** A second way in, where one makes sense. */
  secondary?: { label: string; href: string };
  /**
   * This service's next action is the self-service booking search.
   *
   * The search can be locked from the admin, so the catalogue resolves the
   * button and the first process step through lib/booking-access.ts instead of
   * printing what is written above. `action` here is the fallback, and it must
   * be a page that is not the search.
   */
  usesBookingSearch?: boolean;
  /**
   * What to expect about price. Never a number this site cannot stand behind.
   */
  pricing: string;
  /**
   * WHAT ARRIVES, ANSWERED THE SAME FOUR WAYS FOR EVERY SERVICE.
   *
   * `receive` above is a list of things, and a list of things does not answer
   * the questions somebody actually has before they commit: what format is it
   * in, how many times can I change my mind, is anything actually BOOKED or is
   * this research, and does somebody confirm the kosher and Shabbos side or
   * merely look it up. Four fields rather than free prose so no service can
   * quietly skip the awkward one — which is `booking`, every time.
   *
   * The fifth question — how long anybody is there afterwards — is deliberately
   * NOT here. It is one answer for the whole business rather than six, the site
   * cannot yet stand behind it, and it belongs beside the other unanswered
   * commercial terms where it is marked as outstanding: words.pricingSupportAfter
   * on the "What to expect about price" panel.
   */
  deliverables: {
    /** The thing itself: a document, a page in the account, both. */
    format: string;
    /** How changes work after it has been sent. */
    revisions: string;
    /** Whether anything is BOOKED, or researched and handed to you to book. */
    booking: string;
    /** Whether the kosher and Shabbos side is confirmed with a source, or looked up. */
    confirmations: string;
  };
};

/** The four questions, in the order somebody asks them. */
export const DELIVERABLE_QUESTIONS: ReadonlyArray<{ key: keyof Service["deliverables"]; label: string }> = [
  { key: "format", label: "What arrives" },
  { key: "revisions", label: "Changes" },
  { key: "booking", label: "Booked, or researched" },
  { key: "confirmations", label: "Kosher and Shabbos" },
];

export const services: readonly Service[] = [
  {
    id: "vacation-planning",
    title: "Personal vacation planning",
    summary: "You tell us the shape of the trip; we come back with a plan you can actually take.",
    who: "You want a holiday rather than a project, and you would rather not spend six evenings working out whether a town has anything to eat.",
    included: [
      "A conversation about what you want from the trip, not a form",
      "Destination options that suit the dates, the ages and your kosher standards and religious needs",
      "The kosher side worked out before anything is booked — food, Shabbos, minyanim, mikvaos",
      "A day-by-day outline you can change",
      "Somewhere to stay that suits the walk you are willing to do",
    ],
    process: [
      "Send us your answers — the planning questions take a couple of minutes and nothing in them is required.",
      "We read them and come back with questions of our own, and usually two or three directions to choose between.",
      "You pick a direction. We build the itinerary around it and send it to you.",
      "You change what you want changed. We adjust until it is right.",
    ],
    receive: [
      "A written day-by-day itinerary",
      "The practical notes for each place — what is nearby, what is open on Shabbos, what to book ahead",
      "The same trip in your account on this site, which you can edit and print",
    ],
    action: { label: "Tell us about the trip", href: "/plan" },
    secondary: { label: "Or plan it yourself, free", href: "/itinerary" },
    pricing:
      "Quoted once we understand the trip, and told to you before any work starts. What moves the number, how long a quote takes and whether changes cost extra are answered under “What to expect about price” below.",
    deliverables: {
      format:
        "A written day-by-day itinerary, and the same trip loaded into your account here — which you can open on a phone, edit yourself and print for the car.",
      revisions:
        "Not a numbered allowance. You say what you want different and we adjust until the itinerary is right; that is part of the planning rather than an extra.",
      booking:
        "Nothing is booked for you under this service. You get the plan and the places; booking the travel is either yours to do through the search here, or a separate arrangement.",
      confirmations:
        "Yes. Kosher food, Shabbos, minyanim and mikvaos are answered for your destination and dates, and the itinerary names where each answer came from so you can reconfirm close to travel.",
    },
  },
  {
    id: "itinerary-design",
    title: "Itinerary and route design",
    summary: "The order of the days, and the driving between them, worked out properly.",
    who: "You know where you are going and several places are involved — a few towns, a few countries, or a route with kevarim on it.",
    included: [
      "The order of the stops, so the driving makes sense rather than doubling back",
      "Real road driving times between each one, not straight-line distance",
      "Where Shabbos falls, and whether the plan reaches somewhere in time for it",
      "Border crossings on the route and what they are known to cost in time",
      "How long each stop actually takes, so a day holds up",
    ],
    process: [
      "Send us the places, or save them in the planner and share the trip with us.",
      "We order the route and time it against real roads.",
      "We tell you where the plan is too tight, and what to move.",
    ],
    receive: [
      "A route with times, in the order you will drive it",
      "A printable copy for the car",
      "The same route in the planner, editable",
    ],
    action: { label: "Ask us to design the route", href: "/contact" },
    secondary: { label: "The planner does this for free", href: "/itinerary" },
    pricing:
      "The planner does the routing and the timing at no cost, for anybody, without an account. A route designed by us is quoted with the planning.",
    deliverables: {
      format:
        "A route with real road times in the order you will drive it, in the planner and as a printable page for the car.",
      revisions: "Move a stop or a date and we retime the route around it, as part of the same piece of work.",
      booking: "Nothing is booked. This is the shape of the trip — the driving, the order and the timing.",
      confirmations:
        "Where Shabbos falls on the route is worked out and flagged, including whether the plan reaches somewhere in time for it. Food and minyanim at each stop come with the personal planning above.",
    },
  },
  {
    id: "flights-hotels-transport",
    title: "Flights, hotels and transportation",
    summary: "Searching and booking the travel — with cash, or with your own miles and points.",
    who: "You want the travel booked, or you want to know whether your points are worth spending on this trip.",
    included: [
      "Flight, hotel and car search on this site, paying by card",
      "The points-versus-cash comparison for each leg, so you can see which is worth using",
      "Hotels chosen for where they stand, not only for their price",
      "Airport transfers and drivers where the destination needs them",
    ],
    // The first step and the button are NOT written here. This service's next
    // action is the self-service search, and the owner can close that path from
    // the admin — so the catalogue resolves both through lib/booking-access.ts.
    // What used to be written here was "Search here and book it yourself —
    // everything on the booking page is yours to use now", printed on a public
    // page while the booking page was behind an access code. Both halves of
    // that sentence were false at once, which is what a hardcoded claim about
    // a setting somebody else controls eventually becomes.
    usesBookingSearch: true,
    process: [
      "Tell us the route and we will look, and say what we would do.",
      "Whatever is booked goes into the trip alongside everything else, with the confirmation numbers.",
    ],
    receive: ["Bookings in your own name", "The confirmations kept with the rest of the itinerary"],
    action: { label: "Ask us about flights and hotels", href: "/flight-booking-assistance" },
    secondary: { label: "Ask a person to look instead", href: "/flight-booking-assistance" },
    pricing:
      "Booking through the search costs you nothing extra; the site may earn a commission from the travel provider, which does not change your price. Personal flight booking is currently unavailable, and the page says so rather than taking a request nobody is there to answer.",
    deliverables: {
      format:
        "The booking itself, in your own name with the partner, and the confirmation saved onto your trip beside everything else.",
      revisions:
        "Changes, cancellations and refunds are the airline's, the hotel's or the partner's — under their terms, not ours. Search again here whenever the plan moves.",
      booking:
        "You book. Every search on this site hands off to a partner who takes the payment and issues the ticket or the reservation; nothing is booked on this site.",
      confirmations:
        "The search does not know about kashrus. Which quarter makes Shabbos walkable is answered on the destination and hotel pages before the search opens.",
    },
  },
  {
    id: "kosher-and-shabbos",
    title: "Kosher and Shabbos arrangements",
    summary: "The half of the trip no ordinary travel agent will do for you.",
    who: "You keep kosher, you are going somewhere that does not make that easy, and you would like it settled before you fly.",
    included: [
      "What kosher food genuinely exists at the destination, checked against the certifying body rather than a directory",
      "Which quarter to stay in so Shabbos works on foot",
      "Shabbos meals arranged where a community or a caterer can do it",
      "Minyanim and mikvaos, with the caveat that these are the details most likely to have changed",
      "Provisioning — what to bring, and the last town with a shop that has it",
    ],
    process: [
      "Tell us your kosher standards and religious needs. There is a list on the planning form and none of it is a test.",
      "We check what is available, and say plainly where the answer is 'not much'.",
      "We arrange what can be arranged and tell you what you will need to bring.",
    ],
    receive: [
      "A written answer for each of food, Shabbos, minyanim and mikvaos at your destination",
      "The contacts we used, so you can confirm them yourself close to the dates",
    ],
    action: { label: "Ask about a destination", href: "/contact" },
    secondary: { label: "Look it up yourself first", href: "/kosher-travel" },
    pricing: "Included in personal planning. Asked on its own, it is usually a question we will simply answer.",
    deliverables: {
      format:
        "A written answer for each of food, Shabbos, minyanim and mikvaos at your destination, with the contacts we used listed under it.",
      revisions: "Ask again as the dates get closer — these are the details most likely to have moved.",
      booking:
        "Shabbos meals and a caterer are arranged where a community or a caterer can do it. Everything else is answered rather than booked.",
      confirmations:
        "This service is the confirmation: what exists is checked against the certifying body rather than copied from a directory, and where the honest answer is “not much”, that is what you are told.",
    },
  },
  {
    id: "travel-essentials",
    title: "Travel essentials",
    summary: "Phones, insurance, documents and the things that go wrong at the airport.",
    who: "You have the trip and you want the surrounding details handled rather than discovered.",
    included: [
      "SIMs, eSIMs and hotspots so you land with a working phone",
      "What travel insurance actually covers, said plainly, and where to get it",
      "Entry documents and passport validity, from each country's own official page",
      "What airlines check at the gate, which is not always what the border checks",
    ],
    process: [
      "Read the guides here — they are written to be useful without us.",
      "Ask us about anything specific to your route.",
    ],
    receive: ["A checklist for your own route", "Links to the official source for every rule, because they change"],
    action: { label: "Read the travel guide", href: "/travel-guide" },
    secondary: { label: "Phones and connectivity", href: "/phone-rentals" },
    pricing:
      "The guides are free. Phones and insurance are bought from the provider, not from us; where we link to one we may earn a commission, and it does not change your price.",
    deliverables: {
      format: "A checklist for your own route, with a link to the official source behind every rule on it.",
      revisions: "Ask again whenever the route or the paperwork changes.",
      booking:
        "Nothing is bought for you. A phone, a policy or an eSIM is bought from the provider directly, under their terms.",
      confirmations: "Not part of this one. The kosher and Shabbos side is the service above.",
    },
  },
  {
    id: "heritage-journeys",
    title: "Heritage journey planning",
    summary: "שתוליכנו לשלום — kevarim and the roads between them.",
    who: "You are travelling to kevarim, whether as the whole trip or as two days inside a longer one.",
    included: [
      "Which kevarim, in which order, and what each one takes",
      "Access — who holds the key, what the gate is like, and what to do if nobody answers",
      "The shomer or local contact where we hold one, with a note on how recently it was checked",
      "Kosher food and a minyan in towns that often have neither",
      "A driver who knows the roads, where one is needed",
    ],
    process: [
      "Tell us who you want to reach. The directory is there if you would rather look first.",
      "We work out the route, the timing and the access, and tell you what is uncertain.",
      "We arrange the driving and the contacts, and give you the numbers to carry.",
    ],
    receive: [
      "A route with the kevarim in order and the driving between them",
      "Access notes and contacts for each site, with their verification status",
      "A printable copy, because signal is not guaranteed where you are going",
    ],
    action: { label: "Start a heritage journey", href: "/plan?kind=heritage" },
    secondary: { label: "Browse the kevarim directory", href: "/heritage" },
    pricing: "Quoted with the planning. Drivers and local contacts are paid to them directly, at their own rates.",
    deliverables: {
      format:
        "A route with the kevarim in order and the driving between them, the access notes and contacts for each site, and a printable copy — signal is not guaranteed where you are going.",
      revisions: "Add or drop a kever and we rework the order and the timing around it.",
      booking:
        "A driver and local contacts are arranged where one is needed, and paid to them directly. Flights and hotels are yours to book, or a separate arrangement.",
      confirmations:
        "Access, the shomer and the local contact are given with a note on how recently each was checked — these change, and a number that worked last year is the most common thing to go wrong on this kind of trip. Kosher food and a minyan are answered for towns that often have neither.",
    },
  },
] as const;
