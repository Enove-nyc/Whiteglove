/**
 * Every outside thing this site is connected to, and what stops without it.
 *
 * There are two dozen environment variables behind this site and no screen
 * that said which were set. That is a bad way to run anything and a worse way
 * to go live: a missing key here does not throw, it makes one feature quietly
 * stop working. Nobody notices that flight-number lookup is dead until
 * somebody types LO282 and gets nothing back.
 *
 * SET IS NOT THE SAME AS WORKING, and this file never pretends otherwise. All
 * it can see is whether a variable has a value. Whether the key is valid, the
 * account is in credit, or the service is up is a different question, and one
 * only a real request can answer — which is what the test buttons beside this
 * are for. Saying "connected" from the presence of a string would be the exact
 * kind of false comfort a launch checklist must not give.
 *
 * WHAT BREAKS, NOT WHAT IS MISSING. "AERODATABOX_API_KEY is not set" tells
 * nobody anything. "A traveller typing a flight number gets nothing back" is
 * the same fact in a form somebody can decide about.
 *
 * THE VALUE IS NEVER READ HERE. Only whether it is empty. Nothing in this file
 * can leak a secret into a page, because nothing in it ever holds one.
 */

/** How much of the site goes with it. */
export type Weight =
  /** The site cannot do its job. */
  | "essential"
  /** A whole feature stops. The rest of the site is fine. */
  | "feature"
  /** Something gets worse, quietly. Nothing stops. */
  | "nicety";

export type Connection = {
  /** The variables that make this work. All of them are needed. */
  vars: string[];
  what: string;
  /** What a person loses. Written as the consequence, not as the cause. */
  without: string;
  weight: Weight;
  /** Where to go and get one, when it is not obvious. */
  where?: string;
};

/**
 * Every connection, in the order somebody setting the site up would want them.
 *
 * A variable the code reads and this list does not name is a connection nobody
 * can see. tests/connections.test.ts reads the source and fails on one, so a
 * new integration added later cannot be invisible.
 */
export const CONNECTIONS: Connection[] = [
  {
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    what: "The private store. Accounts, trips, notes, uploads, the admin's own settings.",
    without:
      "Nobody can make an account or save a trip, no picture can be uploaded, and every setting on these screens falls back to what is written in the code. A message written on the contact form is emailed and kept nowhere, so if the email does not go, the message is gone.",
    weight: "essential",
    where: "Upstash — a free Redis database.",
  },
  {
    vars: ["DATABASE_URL"],
    what: "The content database. Towns, kevarim, listings, shomer numbers.",
    without: "The admin cannot edit any destination, and the public pages show only what is built into the code.",
    weight: "essential",
    where: "Neon — a free Postgres database.",
  },
  {
    vars: ["ADMIN_PASSWORD"],
    what: "The shared password for the admin.",
    without: "Nobody can get into the admin except a named administrator signing in from their own account.",
    weight: "essential",
  },
  {
    vars: ["WHITE_GLOVE_SESSION_SECRET"],
    what: "What signs the session cookies.",
    without:
      "The admin password is used instead, which works — but changing that password then signs everybody out, including travellers who have nothing to do with the admin.",
    weight: "feature",
  },
  {
    vars: ["NEXT_PUBLIC_SITE_URL"],
    what: "This deployment's own address.",
    without:
      "Every page's canonical link and share image is relative, so a link posted to WhatsApp shows no picture and search engines may treat the preview deployments as copies of the site.",
    weight: "feature",
    where: "Set it to https://whitegloveitineraries.com.",
  },
  {
    vars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    what: "Signing in with Google.",
    without:
      "The Google button does not appear on the sign-in page, and everybody signs in by typing an email and a password as before. Nothing else changes and no account is affected.",
    weight: "nicety",
    where: "Google Cloud console, under APIs & Services → Credentials → OAuth client ID (Web application). The redirect URI must be exactly https://whitegloveitineraries.com/api/account/google/callback.",
  },
  {
    vars: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    what: "Sending email.",
    without:
      "No verification code, no password reset, no share invitation, and nothing in your inbox when somebody writes in or leaves a note on a trip. Accounts still work; the emails simply never arrive. Messages sent from the website are still kept and counted on the dashboard — that half does not depend on this.",
    weight: "feature",
    where: "Resend.",
  },
  {
    vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    what: "Taking a subscription payment for Pro or Business.",
    without:
      "Pro and Business can still be offered and granted — somebody asks, you answer, and you put them on the plan yourself. What cannot happen is a card being charged: Settings → Pro and Business refuses to be switched to Stripe without both of these, so no subscribe button is ever drawn that would fail when pressed.",
    weight: "nicety",
    where:
      "Stripe. The secret key is under Developers → API keys. The webhook secret comes from adding an endpoint at /api/billing/webhook listening for checkout.session.completed, customer.subscription.updated and customer.subscription.deleted.",
  },
  {
    vars: ["OWNER_NOTIFICATION_EMAIL", "CONTACT_NOTIFICATION_EMAIL", "OWNER_EMAIL"],
    what: "Where messages to you are sent.",
    without: "Contact messages and suggestions are still kept in the admin — messages on Settings → Messages, and counted on the dashboard — but nothing lands in your inbox.",
    weight: "feature",
  },
  {
    vars: ["NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY"],
    what: "The map, and the address boxes that finish what you type.",
    without: "The map does not draw, and every address has to be typed in full and correctly.",
    weight: "feature",
    where: "Google Cloud. This one is public by design — it is in the browser, and is restricted by domain rather than kept secret.",
  },
  {
    vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_SERVICE_SID", "TWILIO_FROM_NUMBER"],
    what: "Text messages.",
    without: "Somebody who signed up with a phone number rather than an email cannot be sent a verification code, so they cannot finish signing up.",
    weight: "feature",
    where: "Twilio. Either the messaging service or the from-number is enough.",
  },
  {
    vars: ["DUFFEL_ACCESS_TOKEN"],
    what: "Admin-only Duffel search and ticketing at /admin/duffel. Not on the public site.",
    without: "The admin Duffel screen cannot search until a real token is added. Visitors are unaffected — they use partner links on /book.",
    weight: "nicety",
    where: "Duffel dashboard (duffel.com → Developers). A placeholder value is not a token.",
  },
  {
    vars: ["AERODATABOX_API_KEY"],
    what: "Live flight schedules — looking a flight up by its number.",
    without: "A traveller typing a flight number gets nothing back and has to enter the times by hand.",
    weight: "nicety",
    where: "AeroDataBox, through RapidAPI. The free tier is small, so a busy minute can hit its limit.",
  },
  {
    vars: ["ANTHROPIC_API_KEY", "GEMINI_API_KEY"],
    what: "The assistant that answers a traveller's question in words.",
    without: "The assistant says it cannot answer and points at the search instead. Nothing else changes.",
    weight: "nicety",
    where: "Either one is enough.",
  },
  {
    vars: ["KAYAK_AFFILIATE_PARAMS"],
    what: "Your affiliate key for the flight and car searches that open on Kayak.",
    without:
      "The searches still open and still work. They simply earn nothing, and the page looks exactly the same either way — which is why nobody would ever notice.",
    weight: "feature",
  },
  {
    vars: ["BOOKING_AFFILIATE_ID"],
    what: "Your affiliate ID for the hotel searches that open on Booking.com.",
    without: "The same: the search works, earns nothing, and looks identical.",
    weight: "feature",
  },
  {
    vars: ["TRAVELPAYOUTS_MARKER"],
    // Deep links still earn through a pasted tp.media redirect on Settings →
    // What the searches earn. The flight and car *widgets* on /book are
    // different: the official script carries shmarker, and that is how those
    // forms credit the account. Same number, two tools.
    what: "Your Travelpayouts marker — on the flight and car search forms on Search booking partners, and the account number for pasted earning links.",
    without:
      "The flight and car forms on /book do not load. Pasted earning links still work when they are set on Settings → What the searches earn.",
    weight: "feature",
  },
  {
    vars: ["STAY22_AID"],
    what: "Your Stay22 affiliate ID — tracked hotel links and Kayak flight and car searches.",
    without:
      "Hotel and Kayak flight and car searches still open. They earn when this ID is set here or saved on the earnings screen; without either, Kayak flights and cars only earn if a wrap is pasted there.",
    weight: "feature",
    where: "Stay22 hub — the same ID as the Stay22 ID field on Settings → Earnings. A saved ID on that screen wins when both are set.",
  },
  {
    vars: ["TRAVELPAYOUTS_TOKEN"],
    what: "Travelpayouts token for the Flight Search API (live Aviasales offers on /book) and the Data API.",
    without:
      "Flight search on /book still opens Aviasales and Kayak Compare. Live priced rows stay off until this token and the marker are both set and the Search API is approved.",
    weight: "feature",
    where: "Travelpayouts dashboard → API token. Separate from the marker.",
  },
  {
    vars: ["ROUTESTACK_API_KEY", "ROUTESTACK_API_BASE"],
    what: "RouteStack rental cars — the one category the site has no inventory for. Off until it is switched on under Settings → Travel providers, and admin-only until you set it live.",
    without:
      "Nothing changes: cars keep working exactly as they do now, through the tracked compare link. This is an addition, not a replacement.",
    weight: "nicety",
    where: "routestack.ai — start with their sandbox key. ROUTESTACK_API_BASE only needs setting to point at the sandbox host; leave it blank for production.",
  },
  {
    vars: ["STAY22_API_KEY"],
    what: "Stay22 Direct Travel API key — live places to stay and prices on Search booking partners.",
    without:
      "Where to stay still opens via the Stay22 ID on the earnings screen (or Booking.com). Live options on the page stay off until this is set.",
    weight: "feature",
    where: "hub.stay22.com → Settings → API. The AID on the earnings screen is separate and still required for tracked links.",
  },
  {
    vars: ["SITE_ACCESS_PASSWORD"],
    what: "The full code that gets somebody into the site while it is closed, and keeps them in.",
    without:
      "The admin password is used for both, so anybody you let in to look at the site is holding the key to the admin as well.",
    weight: "feature",
  },
  {
    vars: ["SITE_PREVIEW_PASSWORD"],
    what: "The one-off code for somebody you want to show the site to while it is closed.",
    without: "Only the full code gets anybody in while the site is locked, and that code lets them keep coming back.",
    weight: "nicety",
  },
  {
    vars: ["GOOGLE_ROUTES_URL"],
    what: "Where the traffic-aware driving times are asked for. Google's own address unless this says otherwise.",
    without: "Nothing. It exists so this path can be pointed at a stub during testing.",
    weight: "nicety",
  },
  {
    vars: ["OSRM_ROUTER_URL"],
    what: "The open router used when Google has no answer. The public one unless this points somewhere else.",
    without: "Nothing. Set it only to use a self-hosted router.",
    weight: "nicety",
  },
  {
    vars: ["TRIP_ARRANGEMENT"],
    what: 'Set to "1" to switch on arranging trips for people — taking the request and acting on it.',
    without:
      "The pages that offer it stay up and say it is coming soon, and the form does not send. That is the decision, not an accident: nobody should be able to ask for something there is nobody to do yet.",
    weight: "nicety",
  },
  {
    vars: ["DEFAULT_PHONE_COUNTRY"],
    what: "Which country a phone number typed without a code belongs to.",
    without: "It is read as American, so somebody in London typing their own number gets it stored wrong.",
    weight: "nicety",
  },
  {
    vars: ["GITHUB_ISSUE_TOKEN", "GITHUB_ISSUE_REPO"],
    what:
      "Files a reported site fault as an issue on the code repository, so it can be picked up and fixed. Only site faults — never a correction to a place, a hechsher or a phone number, which no repository can settle.",
    without:
      "A reported fault still reaches your inbox and still makes a Trello card. It simply does not open an issue as well.",
    weight: "nicety",
    where: "A GitHub fine-grained token with Issues: write on this repository, and the repo as owner/name.",
  },
  {
    vars: ["DIRECTORY_FEATURED_NOTE"],
    what: "The wording shown beside a featured listing in the directory.",
    without: "The built-in wording is used. Nothing breaks.",
    weight: "nicety",
  },
  {
    vars: ["SITE_LOCK_ENABLED"],
    what: "Closes the whole website to anybody without a code.",
    without: "The site is open, which is what you want once it is live.",
    weight: "nicety",
  },
];

/** Set means "has a value". It does NOT mean the key works. */
export type Reading = { connection: Connection; missing: string[]; ready: boolean };

/**
 * Which connections are configured, given a map of name to value.
 *
 * The values are read only for emptiness. `env` is passed in rather than read
 * here so this can be tested, and so the caller is the one that decides which
 * variables to look at — Next substitutes them by name, and a whole-object
 * read is not the same thing.
 */
export function readConnections(env: Record<string, string | undefined>): Reading[] {
  return CONNECTIONS.map((connection) => {
    const missing = connection.vars.filter((name) => !env[name]?.trim());
    return { connection, missing, ready: missing.length === 0 };
  });
}

/**
 * Some connections are happy with one of their variables rather than all.
 *
 * Twilio takes either a messaging service or a from-number; the assistant
 * takes either model. Saying "not set" because the other one is absent would
 * send somebody looking for a key they do not need.
 */
const ANY_ONE_OF: Record<string, string[][]> = {
  TWILIO_ACCOUNT_SID: [["TWILIO_MESSAGING_SERVICE_SID", "TWILIO_FROM_NUMBER"]],
  ANTHROPIC_API_KEY: [["ANTHROPIC_API_KEY", "GEMINI_API_KEY"]],
  OWNER_NOTIFICATION_EMAIL: [["OWNER_NOTIFICATION_EMAIL", "CONTACT_NOTIFICATION_EMAIL", "OWNER_EMAIL"]],
};

/** The same reading, with the either-or connections judged properly. */
export function readConnectionsProperly(env: Record<string, string | undefined>): Reading[] {
  return readConnections(env).map((reading) => {
    const groups = ANY_ONE_OF[reading.connection.vars[0]];
    if (!groups) return reading;
    const missing = reading.missing.filter((name) => {
      const group = groups.find((g) => g.includes(name));
      // Not missing if anything else in its group is set.
      return !group?.some((other) => env[other]?.trim());
    });
    return { ...reading, missing, ready: missing.length === 0 };
  });
}

/**
 * What to say at the top: the things that would stop the site working.
 *
 * Counts only the essentials, because a launch checklist that says "6 things
 * are not set" when five of them are optional teaches somebody to ignore it.
 */
export function launchSummary(readings: Reading[]): string {
  const broken = readings.filter((r) => !r.ready && r.connection.weight === "essential");
  const features = readings.filter((r) => !r.ready && r.connection.weight === "feature");
  if (broken.length > 0) {
    return `${broken.length} thing${broken.length === 1 ? "" : "s"} the site cannot run without ${broken.length === 1 ? "is" : "are"} not set.`;
  }
  if (features.length > 0) {
    return `Everything essential is set. ${features.length} whole feature${features.length === 1 ? "" : "s"} would be off.`;
  }
  return "Everything is set. Whether each key actually works is a separate question — use the tests below.";
}

const ORDER: Record<Weight, number> = { essential: 0, feature: 1, nicety: 2 };

/** Worst first, and within that the ones that are not set. */
export function sortForReview(readings: Reading[]): Reading[] {
  return [...readings].sort(
    (a, b) =>
      ORDER[a.connection.weight] - ORDER[b.connection.weight] ||
      Number(a.ready) - Number(b.ready) ||
      a.connection.vars[0].localeCompare(b.connection.vars[0]),
  );
}

export const WEIGHT_LABELS: Record<Weight, string> = {
  essential: "The site needs this",
  feature: "A whole feature depends on it",
  nicety: "Optional",
};
