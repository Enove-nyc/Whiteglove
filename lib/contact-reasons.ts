/**
 * Why somebody is writing to us, and what to ask them because of it.
 *
 * ONE PAGE, FOUR ERRANDS. A person reaching /contact is doing one of four
 * quite different things: asking us to plan or book a trip, telling us
 * something on the site is wrong, asking about advertising, or asking a
 * question. A single "Message" box serves all four badly — the correction
 * arrives without the page it is about, the advertising enquiry arrives
 * without the business, and the trip arrives without the dates, so every one
 * of them costs a reply asking for what the form should have asked for.
 *
 * THE RULE THIS FILE ENFORCES is the same one the planning form already
 * follows for the kevarim question: a field belongs to a reason and appears
 * for that reason only. Somebody reporting a wrong address is never shown a
 * box asking how many children are travelling, and somebody asking about a
 * honeymoon is never asked which page has the error on it. It is enforced
 * here, as data, so the page cannot drift from it.
 *
 * AND WHY PERSONAL ASSISTANCE LIVES HERE AND NOWHERE ELSE. Arranging a trip
 * for somebody is a real thing this business does, and it is the one offer
 * that would change how every other page reads. On a destination page or a
 * hotel result, "we can arrange this for you" turns a usable tool into a
 * sales funnel — the visitor stops reading the kosher notes and starts
 * working out what the catch is. Behind a reason on the contact page it is
 * exactly what it is: a thing you can ask for, once you have decided to ask
 * for something.
 */

export type ContactReason = "trip" | "correction" | "advertise" | "question" | "fault";

export type ContactField = {
  name: string;
  label: string;
  placeholder?: string;
  kind: "text" | "url" | "textarea";
  required: boolean;
  /** Under the field, when the field needs a sentence to be answerable. */
  hint?: string;
};

export type ContactReasonSpec = {
  value: ContactReason;
  /** On the button. */
  label: string;
  /** Under the label, so somebody picks the right one first time. */
  blurb: string;
  /** The heading over the fields, once chosen. */
  heading: string;
  /** What lands in the inbox, so four errands do not look alike in a list. */
  subject: string;
  /** Asked for this reason and no other. */
  fields: readonly ContactField[];
  /** The label on the message box, which is not "Message" for all four. */
  messageLabel: string;
  messagePlaceholder: string;
};

export const CONTACT_REASONS: readonly ContactReasonSpec[] = [
  {
    value: "trip",
    label: "Plan or book a trip for me",
    blurb: "You would rather somebody else did the working out.",
    heading: "Tell us about the trip",
    subject: "Trip planning request",
    // No fields here: the trip is asked about by the planning form, which
    // already knows how to ask the kevarim question of the right people and
    // how to read the answers somebody left at /plan.
    fields: [],
    messageLabel: "Anything else we should know",
    messagePlaceholder: "",
  },
  {
    value: "correction",
    label: "Something here is wrong",
    blurb: "An address, a time, a hechsher, a shomer's number.",
    heading: "What is wrong, and where",
    subject: "Correction",
    fields: [
      {
        name: "page",
        label: "Which page",
        placeholder: "Paste the address, or name the town",
        kind: "text",
        required: true,
      },
      {
        name: "source",
        label: "Where you know it from (optional)",
        placeholder: "A link, a phone call, or “I was there last month”",
        kind: "text",
        required: false,
        hint: "Not required. It decides how fast the correction goes live, not whether we believe you.",
      },
    ],
    messageLabel: "What it says, and what it should say",
    messagePlaceholder: "",
  },
  {
    value: "advertise",
    label: "Advertise or list a business",
    blurb: "A hotel, a programme, a caterer, a driver, a tour.",
    heading: "About the business",
    subject: "Advertising enquiry",
    fields: [
      { name: "business", label: "Business name", kind: "text", required: true },
      { name: "website", label: "Website (optional)", placeholder: "https://", kind: "url", required: false },
      {
        name: "where",
        label: "Where it operates",
        placeholder: "A city, a country, or “worldwide”",
        kind: "text",
        required: true,
      },
    ],
    messageLabel: "What you have in mind",
    messagePlaceholder: "",
  },
  {
    /**
     * THE ONE REASON THAT IS NOT ABOUT THE WORLD.
     *
     * "Something here is wrong" above and this one look alike and are not. The
     * first is a claim about a place — an address, a hechsher, a shomer's
     * number — and only a person who can ring somebody up is able to settle
     * it. This is a claim about the SITE, and the site is the one thing that
     * can be checked without leaving the code. So it is the only queue routed
     * to the bot (lib/trello.ts), and the only one that opens an issue.
     *
     * The two questions asked here are the two that decide whether a fault can
     * be reproduced at all: which page, and what happened. The device is
     * optional and is asked because half the faults ever reported on this site
     * happened at one width and nowhere else.
     */
    value: "fault",
    label: "Something on the site is broken",
    blurb: "A page that will not load, a button that does nothing, a link that goes nowhere.",
    heading: "What broke, and where",
    subject: "Site fault",
    fields: [
      {
        // NOT "page", which belongs to the correction above. A field name is
        // owned by exactly one reason — tests/contact-reasons enforces it —
        // so that a value typed under one reason can never be composed into
        // another's message. The label is what a person reads, and both may
        // fairly ask "Which page".
        name: "faultPage",
        label: "Which page",
        placeholder: "Paste the address you were on",
        kind: "text",
        required: true,
      },
      {
        name: "device",
        label: "Phone or computer (optional)",
        placeholder: "iPhone, Safari — or Windows, Chrome",
        kind: "text",
        required: false,
        hint: "Worth a second: plenty of faults happen on a phone and nowhere else.",
      },
    ],
    messageLabel: "What you did, and what happened instead",
    messagePlaceholder: "",
  },
  {
    value: "question",
    label: "Ask a question",
    blurb: "Anything else.",
    heading: "Your question",
    subject: "Question",
    fields: [],
    messageLabel: "Your question",
    messagePlaceholder: "",
  },
] as const;

export const DEFAULT_CONTACT_REASON: ContactReason = "question";

/** A reason from a query string. Anything unrecognised is not a reason. */
export function readReason(value: string | string[] | undefined): ContactReason | "" {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase() ?? "";
  return CONTACT_REASONS.some((reason) => reason.value === raw) ? (raw as ContactReason) : "";
}

export function reasonSpec(value: ContactReason): ContactReasonSpec {
  const found = CONTACT_REASONS.find((reason) => reason.value === value);
  // Not reachable through readReason, and a thrown error in a form is worse
  // than the question box.
  return found ?? CONTACT_REASONS[CONTACT_REASONS.length - 1];
}

/**
 * The message that reaches the inbox.
 *
 * The extra answers go ABOVE what was typed, because the person reading this
 * needs to know which page and which business before they read the complaint
 * about it. An unanswered optional field is left out rather than printed
 * empty — a list of blank labels reads as a broken form.
 */
export function composeMessage(
  reason: ContactReason,
  answers: Readonly<Record<string, string>>,
  message: string,
): string {
  const spec = reasonSpec(reason);
  const lines = spec.fields
    .map((field) => [field.label.replace(/\s*\(optional\)$/i, ""), (answers[field.name] ?? "").trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value}`);
  const body = message.trim();
  return lines.length > 0 ? `${lines.join("\n")}\n\n${body}` : body;
}

/** What is missing, in the order the fields are asked. Empty means send it. */
export function missingFields(
  reason: ContactReason,
  answers: Readonly<Record<string, string>>,
): ContactField[] {
  return reasonSpec(reason).fields.filter((field) => field.required && !(answers[field.name] ?? "").trim());
}
