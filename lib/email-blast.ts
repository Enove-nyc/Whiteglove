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

/* ---- what a message is made of ------------------------------------------ */

/**
 * A message is a stack of pieces, not a box of text.
 *
 * WHY IT CHANGED. It was one plain-text field, on the argument that a plain
 * note from a person reads better than a designed one. The owner's answer was
 * that an email from this site should look like this site — and he is right
 * about his own product: a kosher travel letter with a kever photograph in it
 * and the crest at the top is the thing people forward, and a wall of grey text
 * is the thing they delete.
 *
 * FIVE PIECES AND NO MORE. Heading, words, picture, button, rule. Every one of
 * them is a thing the owner can point at on his own website. There is no font
 * picker, no colour picker and no column layout, because the moment an email
 * has those it starts looking like a template somebody bought, and because
 * every one of them is a way to make a message that renders differently in
 * Outlook than it did on the screen it was written on.
 *
 * THE OLD DRAFTS STILL OPEN. A blast saved before this existed has `body` and
 * no blocks; `blocksOf` turns it into a single block of words, so nothing
 * written earlier is lost or has to be retyped.
 */
export type BlastBlock =
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string }
  /** `url` is a same-origin /api/media path from the admin upload. */
  | { kind: "image"; url: string; alt: string; caption: string; href: string }
  | { kind: "button"; label: string; href: string }
  | { kind: "divider" };

export type BlastBlockKind = BlastBlock["kind"];

export const BLAST_BLOCK_KINDS: readonly BlastBlockKind[] = ["heading", "text", "image", "button", "divider"];

export const BLAST_BLOCK_LABELS: Record<BlastBlockKind, { label: string; detail: string }> = {
  heading: { label: "Heading", detail: "A line in the display face, to start a section." },
  text: { label: "Words", detail: "A paragraph or several. Any address you paste becomes a link." },
  image: { label: "Picture", detail: "A photograph, with an optional caption and somewhere to go." },
  button: { label: "Button", detail: "One thing to press — a destination, a programme, a listing." },
  divider: { label: "Rule", detail: "A gold line, to separate one part from the next." },
};

export const MAX_HEADING = 90;
export const MAX_BUTTON_LABEL = 40;
export const MAX_CAPTION = 140;
export const MAX_BLOCKS = 30;

export function emptyBlastBlock(kind: BlastBlockKind): BlastBlock {
  switch (kind) {
    case "heading":
      return { kind, text: "" };
    case "image":
      return { kind, url: "", alt: "", caption: "", href: "" };
    case "button":
      return { kind, label: "", href: "" };
    case "divider":
      return { kind };
    default:
      return { kind: "text", text: "" };
  }
}

/** Tidy anything stored or posted into real blocks. Never throws. */
export function cleanBlocks(raw: unknown): BlastBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: BlastBlock[] = [];
  for (const entry of raw.slice(0, MAX_BLOCKS)) {
    const value = (entry ?? {}) as Record<string, unknown>;
    const str = (key: string, cap: number) => (typeof value[key] === "string" ? (value[key] as string).slice(0, cap) : "");
    switch (value.kind) {
      case "heading":
        out.push({ kind: "heading", text: str("text", MAX_HEADING) });
        break;
      case "text":
        out.push({ kind: "text", text: str("text", MAX_BODY) });
        break;
      case "image":
        out.push({
          kind: "image",
          url: str("url", 300),
          alt: str("alt", MAX_CAPTION),
          caption: str("caption", MAX_CAPTION),
          href: str("href", 300),
        });
        break;
      case "button":
        out.push({ kind: "button", label: str("label", MAX_BUTTON_LABEL), href: str("href", 300) });
        break;
      case "divider":
        out.push({ kind: "divider" });
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * The blocks of a message, whether it was written before blocks existed or not.
 *
 * A draft from the plain-text days becomes one block of words, which is exactly
 * what it was. Nothing is lost and nothing has to be retyped.
 */
export function blocksOf(blast: { blocks?: BlastBlock[]; body?: string }): BlastBlock[] {
  if (blast.blocks && blast.blocks.length > 0) return blast.blocks;
  const body = blast.body?.trim();
  return body ? [{ kind: "text", text: body }] : [];
}

/** Whether a block would put anything on the page. An empty one is skipped. */
export function blockHasContent(block: BlastBlock): boolean {
  switch (block.kind) {
    case "heading":
    case "text":
      return Boolean(block.text.trim());
    case "image":
      return Boolean(block.url.trim());
    case "button":
      return Boolean(block.label.trim() && block.href.trim());
    case "divider":
      return true;
  }
}

/**
 * Why these blocks cannot be sent, or null.
 *
 * A BUTTON WITH NO ADDRESS IS THE ONE WORTH REFUSING. It renders as something
 * to press that does nothing, in somebody else's inbox, where the owner will
 * never see it happen. Everything else empty is simply left out.
 */
export function blocksProblem(blocks: BlastBlock[]): string | null {
  const real = blocks.filter(blockHasContent);
  if (real.length === 0) return "Add something to the message.";
  if (!real.some((block) => block.kind === "text" || block.kind === "heading")) {
    return "Add some words — a message that is only pictures and buttons reads as an advertisement.";
  }
  for (const block of blocks) {
    if (block.kind === "button" && block.label.trim() && !block.href.trim()) {
      return `The button "${block.label.trim()}" has nowhere to go.`;
    }
    if (block.kind === "button" && !block.label.trim() && block.href.trim()) {
      return "One of the buttons has no words on it.";
    }
    if (block.kind === "image" && block.url.trim() && !block.alt.trim()) {
      return "Every picture needs a short description, for the people whose email does not show pictures.";
    }
  }
  return null;
}

export type BlastState = "draft" | "sending" | "sent";

export type EmailBlast = {
  id: string;
  subject: string;
  /**
   * The message, as a stack of pieces.
   *
   * Optional only so that a blast written before blocks existed still parses.
   * Read it through `blocksOf`, never directly.
   */
  blocks?: BlastBlock[];
  /** What a message written before blocks existed held. Kept so nothing is lost. */
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
  /**
   * The address these updates come from. Blank uses the site-wide sender.
   *
   * Its own setting because an update is not a verification code: somebody
   * will reply to it, and that reply has to reach a mailbox a person opens.
   * See blastSender in lib/email.ts.
   */
  fromEmail: string;
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_BLAST_SETTINGS: BlastSettings = { open: false, fromEmail: "" };

/**
 * Why this cannot be the sending address, or null.
 *
 * IT HAS TO BE ON THE DOMAIN RESEND HAS BEEN SHOWN CONTROL OF. Sending as a
 * domain that has not been verified is refused at the API in the good case and,
 * in the bad one, accepted and then dropped into spam by the receiving server
 * for failing DKIM — which looks from this end exactly like a successful send.
 * So the address is checked here, at the moment it is typed, rather than at the
 * moment two hundred messages quietly fail.
 *
 * Blank is allowed and means "use whatever the rest of the site uses".
 */
export function senderProblem(raw: string, domain: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const address = value.includes("<") ? (value.match(/<([^>]+)>/)?.[1] ?? "") : value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return "That is not an email address.";
  const at = address.split("@")[1]?.toLowerCase() ?? "";
  if (at !== domain.toLowerCase() && !at.endsWith(`.${domain.toLowerCase()}`)) {
    return `It has to be an address at ${domain} — that is the domain verified with Resend, and mail sent as anything else is refused or lands in spam.`;
  }
  return null;
}

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

/**
 * Why this message cannot be written down or sent, or null.
 *
 * THE SUBJECT AND THE AUDIENCE ONLY. What is IN the message is checked by
 * `blocksProblem`, because a message is a stack of pieces now rather than a box
 * of text, and one function that knew about both would have to be told which
 * kind it was looking at.
 */
export function blastProblem(input: { subject?: string; topics?: unknown }): string | null {
  const subject = input.subject?.trim() ?? "";
  if (!subject) return "Give it a subject line — that is the whole of what most people will read.";
  if (subject.length > MAX_SUBJECT) return `Keep the subject under ${MAX_SUBJECT} characters.`;
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
  blast: Pick<EmailBlast, "subject" | "topics"> & { blocks?: BlastBlock[]; body?: string };
  audienceSize: number;
  deliveryReady: { apiKeySet: boolean; usingTestSender: boolean };
}): string | null {
  if (!input.settings.open) return "Sending is switched off. Turn it on above when you want this to go out.";
  if (!input.deliveryReady.apiKeySet) return "Resend is not connected on this deployment, so nothing can be sent.";
  if (input.deliveryReady.usingTestSender) {
    return "Mail is still going out from the shared test sender, which only reaches your own inbox. Verify whitegloveitineraries.com in Resend and set RESEND_FROM_EMAIL first — otherwise this would look sent and arrive nowhere.";
  }
  const problem = blastProblem(input.blast) ?? blocksProblem(blocksOf(input.blast));
  if (problem) return problem;
  if (input.audienceSize === 0) return "Nobody on the list has asked about these topics, so there is nobody to send to.";
  return null;
}

/* ---- links in the words ------------------------------------------------- */

/**
 * A stretch of the message: plain words, or a link.
 *
 * WHY THIS EXISTS. The messages this feature is for are about a thing that is
 * somewhere — a Pesach programme, a kosher place that has opened, a destination
 * published. "Vienna is on the site" with no way to get to Vienna is a message
 * that makes somebody go and look for it, and most of them will not. So a URL
 * pasted into the body becomes a link in the email.
 *
 * NO MARKUP LANGUAGE. Not markdown, not HTML, not a link button with its own
 * two fields. The owner writes the message the way he would write it to one
 * person, pastes an address where he would paste one, and it is clickable. A
 * syntax to learn is a syntax to get wrong at 200 recipients.
 */
export type BodySegment = { text: string; url?: string };

/**
 * `http://` and `https://` only.
 *
 * NOT bare "whitegloveitineraries.com" — the text of an email is full of things
 * that look like hostnames ("Pesach 5787.Booking opens") and turning those into
 * links produces a message that looks broken. And NOT other schemes: `mailto:`
 * is harmless but `javascript:` and `data:` are not, and a rule that admits one
 * scheme is a rule somebody will widen later.
 *
 * The trailing-punctuation trim is what makes it usable in a sentence — "see
 * https://example.com/vienna." should link the address, not the full stop.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

export function splitLinks(block: string): BodySegment[] {
  const out: BodySegment[] = [];
  let at = 0;
  for (const match of block.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    let url = match[0];
    // Punctuation that ended the sentence rather than the address. Closing
    // brackets only count when something opened them inside the URL itself.
    let trimmed = "";
    for (;;) {
      const last = url.slice(-1);
      const isStop = ".,;:!?".includes(last);
      const isCloser = (last === ")" && !url.includes("(")) || (last === "]" && !url.includes("["));
      if (!isStop && !isCloser) break;
      trimmed = last + trimmed;
      url = url.slice(0, -1);
    }
    if (!url) continue;
    if (start > at) out.push({ text: block.slice(at, start) });
    out.push({ text: url, url });
    at = start + match[0].length - trimmed.length;
  }
  if (at < block.length) out.push({ text: block.slice(at) });
  return out.length > 0 ? out : [{ text: block }];
}
