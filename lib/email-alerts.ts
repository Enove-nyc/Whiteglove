/**
 * What somebody can ask to be told about, and how that signup is shaped.
 *
 * Not a newsletter blast list. Each topic is a concrete reason a kosher
 * traveler would want a message — a new destination, a Pesach programme, a
 * place they already searched for — and the copy on the form has to say that
 * reason, not "join our list".
 *
 * Consent is required at signup and stored with the record. Sending without
 * both is not an option this module exposes.
 */

export const ALERT_TOPICS = [
  "new_destinations",
  "new_listings",
  "hotel_deals",
  "pesach_sukkos",
  "seasonal",
  "destination_updates",
  "searched_destination",
] as const;

export type AlertTopic = (typeof ALERT_TOPICS)[number];

export const ALERT_TOPIC_LABELS: Record<AlertTopic, string> = {
  new_destinations: "New kosher destinations",
  new_listings: "New verified listings",
  hotel_deals: "Hotel and travel deals",
  pesach_sukkos: "Pesach and Sukkos programmes",
  seasonal: "Seasonal vacation opportunities",
  destination_updates: "Updates for a destination I care about",
  searched_destination: "When a place I searched for is added or updated",
};

/** Short line under the topic on a form — why this is worth ticking. */
export const ALERT_TOPIC_BLURBS: Record<AlertTopic, string> = {
  new_destinations: "When we publish a new place with kosher and Shabbos practicalities.",
  new_listings: "When a hotel, restaurant or practical listing is checked and published.",
  hotel_deals: "Partner offers worth knowing about — never invented discounts.",
  pesach_sukkos: "Seasonal programmes once we have something concrete to share.",
  seasonal: "Summer and school-holiday opportunities that fit kosher travel.",
  destination_updates: "Changes to a specific place you name below.",
  searched_destination: "If you looked for somewhere we did not have yet, we will tell you when it lands.",
};

export type AlertSignup = {
  /** Lowercased email. The only personal field we keep for delivery. */
  email: string;
  topics: AlertTopic[];
  /** Vacation destination slug, when the signup is about one place. */
  destinationSlug?: string;
  /** Free-text place name when there is no slug yet (a searched miss). */
  destinationQuery?: string;
  /** Where on the site they signed up — path only, no query string. */
  sourcePage: string;
  /** ISO timestamp of explicit consent. Required. */
  consentedAt: string;
  createdAt: string;
  /** When they confirmed via email, if double opt-in ran. */
  confirmedAt?: string;
  /** When they unsubscribed. Kept so re-subscribe is honest, not silent. */
  unsubscribedAt?: string;
  /** Opaque token for one-click unsubscribe links. */
  unsubToken: string;
};

export type AlertSignupInput = {
  email: string;
  topics: unknown;
  destinationSlug?: string;
  destinationQuery?: string;
  sourcePage?: string;
  consented: boolean;
};

export function isAlertTopic(value: unknown): value is AlertTopic {
  return typeof value === "string" && (ALERT_TOPICS as readonly string[]).includes(value);
}

export function readTopics(raw: unknown): AlertTopic[] {
  if (!Array.isArray(raw)) return [];
  const out: AlertTopic[] = [];
  for (const entry of raw) {
    if (isAlertTopic(entry) && !out.includes(entry)) out.push(entry);
  }
  return out;
}

/**
 * Why this signup cannot be accepted, or null.
 *
 * Consent is not optional and not inferred from a pre-ticked box — the form
 * must send `consented: true` after the person ticks it.
 */
export function signupProblem(input: AlertSignupInput): string | null {
  const email = input.email?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  if (!input.consented) {
    return "Tick the box to confirm you want these updates.";
  }
  const topics = readTopics(input.topics);
  if (topics.length === 0) {
    return "Choose at least one kind of update.";
  }
  if (topics.includes("destination_updates") && !input.destinationSlug?.trim() && !input.destinationQuery?.trim()) {
    return "Name the destination you want updates about.";
  }
  return null;
}

/** Heading and intro for a contextual signup block. */
export function alertCopy(context: {
  kind: "destination" | "seasonal" | "search_miss" | "general";
  destinationName?: string;
}): { heading: string; intro: string } {
  if (context.kind === "destination" && context.destinationName) {
    return {
      heading: `Updates for ${context.destinationName}`,
      // One short line — the destination page keeps this signup compact.
      intro: `One email when a listing or practical detail for ${context.destinationName} changes — unsubscribe anytime.`,
    };
  }
  if (context.kind === "seasonal") {
    return {
      heading: "Pesach, Sukkos and seasonal programmes",
      intro: "When we have a concrete programme or seasonal opportunity worth knowing about, we will email you. No invented offers.",
    };
  }
  if (context.kind === "search_miss") {
    return {
      heading: "Tell me when this place is added",
      intro: "We do not have that yet. Leave your email and we will let you know when it is published — not a general newsletter.",
    };
  }
  return {
    heading: "Kosher travel updates",
    intro: "Choose what you want to hear about — new destinations, verified listings or seasonal programmes. Unsubscribe whenever you like.",
  };
}

/** Default topic set for each context, so the form is useful without busywork. */
export function defaultTopicsFor(kind: "destination" | "seasonal" | "search_miss" | "general"): AlertTopic[] {
  if (kind === "destination") return ["destination_updates", "new_listings"];
  if (kind === "seasonal") return ["pesach_sukkos", "seasonal"];
  if (kind === "search_miss") return ["searched_destination"];
  return ["new_destinations", "pesach_sukkos"];
}
