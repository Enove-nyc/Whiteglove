/**
 * Writing to the people who asked to be written to.
 *
 * WHAT THIS IS NOT. It is not a mailing list the site collects by default, it
 * is not a newsletter, and it does not reach anybody who has an account but
 * never asked for mail. Every address it can send to came through the alert
 * signup in lib/email-alerts.ts, where somebody ticked a box next to a named
 * topic and the moment of consent was written down. If that is not true of an
 * address, this module cannot reach it.
 *
 * IT IS OFF UNTIL THE OWNER TURNS IT ON. A deployment that has never been
 * configured has `open: false`, and the composer says so and refuses to send.
 * Nothing about this switch is clever: it is one boolean, checked on the server
 * at the moment of sending, not only when the screen is drawn.
 *
 * SENDING IS DELIBERATELY IN BATCHES, AND HAS TO BE PRESSED AGAIN. A serverless
 * function has seconds, not minutes, and Resend accepts a couple of messages a
 * second — so a list of three hundred cannot go out in one request, and a loop
 * that tried would be killed halfway with no record of where it got to. Instead
 * each send does a batch, writes down exactly who it reached, and says how many
 * are left. Pressing again continues. It is less impressive and it cannot
 * silently send the same message to the same person twice, which is the failure
 * that matters.
 *
 * THE TOPICS ARE THE AUDIENCE. A blast goes to people who ticked at least one
 * of the topics it is about — not to "everybody". Somebody who asked only about
 * Pesach programmes does not get a message about a new hotel in Vienna, because
 * that is not what they agreed to and it is the fastest way to be marked as
 * spam by the exact people who wanted to hear from you.
 */

import { type AlertSignup, type AlertTopic, ALERT_TOPIC_LABELS, isAlertTopic } from "@/lib/email-alerts";

export const MAX_SUBJECT = 120;
export const MAX_BODY = 6000;

/**
 * How many go out in one press.
 *
 * Small on purpose. Resend's default allowance is a couple of messages a
 * second, a Vercel function is measured in seconds, and the cost of being
 * conservative is one more press of a button.
 */
export const BATCH_SIZE = 15;

/** Milliseconds between messages, so the allowance is not tripped. */
export const SEND_SPACING_MS = 350;

export type BlastState = "draft" | "sending" | "sent";

export type EmailBlast = {
  id: string;
  subject: string;
  /** Plain text. Blank lines separate paragraphs; nothing else is markup. */
  body: string;
  /** Who it is for. At least one. */
  topics: AlertTopic[];
  state: BlastState;
  createdAt: string;
  createdBy: string;
  /** When the last batch went out. */
  lastSentAt?: string;
  /** How many messages have actually been accepted by Resend. */
  sentCount: number;
  /** How many were attempted and refused. */
  failedCount: number;
  /** The last error, so a stuck blast can be explained rather than guessed at. */
  lastError?: string;
};

export type BlastSettings = {
  /** The master switch. Off means nothing can be sent, by anybody. */
  open: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_BLAST_SETTINGS: BlastSettings = { open: false };

export function newBlast(input: { id: string; subject: string; body: string; topics: AlertTopic[]; by: string }): EmailBlast {
  return {
    id: input.id,
    subject: input.subject.trim().slice(0, MAX_SUBJECT),
    body: input.body.trim().slice(0, MAX_BODY),
    topics: input.topics,
    state: "draft",
    createdAt: new Date().toISOString(),
    createdBy: input.by,
    sentCount: 0,
    failedCount: 0,
  };
}

export function readBlastTopics(raw: unknown): AlertTopic[] {
  if (!Array.isArray(raw)) return [];
  const out: AlertTopic[] = [];
  for (const entry of raw) if (isAlertTopic(entry) && !out.includes(entry)) out.push(entry);
  return out;
}

/** Why this message cannot be written down or sent, or null. */
export function blastProblem(input: { subject?: string; body?: string; topics?: unknown }): string | null {
  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  if (!subject) return "Give it a subject line — that is the whole of what most people will read.";
  if (subject.length > MAX_SUBJECT) return `Keep the subject under ${MAX_SUBJECT} characters.`;
  if (!body) return "Write the message.";
  if (body.length > MAX_BODY) return `Keep the message under ${MAX_BODY} characters.`;
  if (readBlastTopics(input.topics).length === 0) return "Choose who it goes to — at least one topic.";
  return null;
}

/**
 * The people this blast is for.
 *
 * Anybody unsubscribed is not here, and nor is anybody whose topics do not
 * overlap with the blast's. Both checks are done at SEND time as well as at
 * preview time, because somebody may unsubscribe between the owner reading the
 * number and pressing the button.
 */
export function audienceFor(signups: AlertSignup[], topics: AlertTopic[]): AlertSignup[] {
  if (topics.length === 0) return [];
  return signups.filter((signup) => !signup.unsubscribedAt && signup.topics.some((topic) => topics.includes(topic)));
}

/**
 * "You asked us to tell you about new kosher destinations."
 *
 * Goes at the bottom of every message, above the unsubscribe link. Somebody who
 * cannot remember signing up is one click from reporting it as spam, and the
 * cheapest way to prevent that is to remind them what they asked for.
 */
export function becauseLine(topics: AlertTopic[]): string {
  const labels = topics.map((topic) => ALERT_TOPIC_LABELS[topic]?.toLowerCase()).filter(Boolean);
  if (labels.length === 0) return "You asked to hear from White Glove Itineraries.";
  if (labels.length === 1) return `You are getting this because you asked us about ${labels[0]}.`;
  const last = labels[labels.length - 1];
  return `You are getting this because you asked us about ${labels.slice(0, -1).join(", ")} and ${last}.`;
}

/** Where this blast has got to, in a sentence. Never empty. */
export function describeBlast(blast: EmailBlast, remaining: number): string {
  if (blast.state === "draft") return "Not sent. Nothing has gone out.";
  const failed = blast.failedCount > 0 ? `, ${blast.failedCount} refused` : "";
  if (remaining > 0) {
    return `${blast.sentCount} sent${failed}. ${remaining} still to go — press send again to continue.`;
  }
  return `Finished: ${blast.sentCount} sent${failed}.`;
}

/**
 * Why sending cannot start, or null.
 *
 * `deliveryReady` is whether Resend is connected AND sending from a verified
 * domain rather than the shared sandbox address. The sandbox sender can only
 * deliver to the account owner's own inbox, so a blast sent with it reaches
 * nobody and looks from the admin screen exactly like one that worked — which
 * is the worst possible way for this to fail.
 */
export function sendProblem(input: {
  settings: BlastSettings;
  blast: EmailBlast;
  audienceSize: number;
  deliveryReady: { apiKeySet: boolean; usingTestSender: boolean };
}): string | null {
  if (!input.settings.open) return "Sending is switched off. Turn it on above when you want this to go out.";
  if (!input.deliveryReady.apiKeySet) return "Resend is not connected on this deployment, so nothing can be sent.";
  if (input.deliveryReady.usingTestSender) {
    return "Mail is still going out from the shared test sender, which only reaches your own inbox. Verify whitegloveitineraries.com in Resend and set RESEND_FROM_EMAIL first — otherwise this would look sent and arrive nowhere.";
  }
  const problem = blastProblem(input.blast);
  if (problem) return problem;
  if (input.audienceSize === 0) return "Nobody on the list has asked about these topics, so there is nobody to send to.";
  return null;
}
