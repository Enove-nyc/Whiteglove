/**
 * A message somebody wrote on the website, and what happens to it.
 *
 * THREE FORMS SEND ONE THING. The contact page, the trip enquiry and the
 * flight booking request all post to /api/contact with the same five fields —
 * a name, an email, a phone, a subject and the words themselves. They read as
 * three different things to the person filling them in and are one queue to
 * the person answering them, which is why the subject is the only thing that
 * tells them apart.
 *
 * WHY THIS FILE EXISTS AT ALL. A contact message used to be an email and
 * nothing else. It was handed to Resend and never written down anywhere, so
 * with no email service connected the visitor was told "we couldn't send your
 * message" and their words were gone — not delayed, not queued, gone — and the
 * only record that anybody had ever written in was an inbox nobody could see
 * from the admin. Somebody asking for a trip is the most valuable thing this
 * website receives, and it was the one thing it did not keep.
 *
 * A MESSAGE IS RECEIVED WHEN IT IS SOMEWHERE IT CAN BE FOUND AGAIN. That is
 * the whole rule the route follows: saved to the queue, or accepted by the
 * email service. Only when it is in neither is the person asked to try again,
 * because only then is there genuinely nothing to answer.
 *
 * Nothing here touches the network or the store, so the rules can be tested on
 * their own.
 */

/** Where a message stands. Two states, because there are two: done or not. */
export type MessageState = "waiting" | "answered";

export type ContactMessage = {
  /** Stable, so a row can be answered rather than matched on its words. */
  id: string;
  at: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  state: MessageState;
  answeredAt?: string;
  answeredBy?: string;
};

/** What a form may send, before any of it has been checked. */
export type ContactInput = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
};

/**
 * How many are kept.
 *
 * The queue is one value in the private store, so it cannot grow without
 * limit. Answered ones fall off the end first — an answered message from
 * February is a record, and a record is what the inbox is for. A message still
 * waiting is never dropped to make room for a newer one, which is the only
 * part of this that would actually cost somebody an answer.
 */
export const MOST_KEPT = 400;

const LIMITS = { name: 120, email: 200, phone: 40, subject: 160, message: 4000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * The message as it will be stored, or why it cannot be.
 *
 * The same three requirements the route has always had — a name, an email that
 * looks like one, and something written — said in the same words, because the
 * wording is what the visitor reads and changing it was not part of this.
 */
export function readMessage(input: ContactInput): { problem: string } | { fields: Omit<ContactMessage, "id" | "at" | "state"> } {
  const name = clean(input.name, LIMITS.name);
  const email = clean(input.email, LIMITS.email);
  const phone = clean(input.phone, LIMITS.phone);
  const subject = clean(input.subject, LIMITS.subject);
  // Not collapsed like the rest: a flight request writes itself out over a
  // dozen lines, and squeezing it onto one would make the only readable thing
  // in the queue unreadable.
  const message = String(input.message ?? "").trim().slice(0, LIMITS.message);

  if (!name || !email || !message) return { problem: "Please add your name, email, and a message." };
  if (!EMAIL.test(email)) return { problem: "Please enter a valid email address." };

  return { fields: { name, email, phone: phone || undefined, subject: subject || undefined, message } };
}

/**
 * A new message, waiting.
 *
 * `at` and `id` are handed in rather than read here, so this can be tested and
 * so the one place that knows the clock is the one that writes to the store.
 */
export function newMessage(fields: Omit<ContactMessage, "id" | "at" | "state">, id: string, at: string): ContactMessage {
  return { ...fields, id, at, state: "waiting" };
}

/**
 * The queue with a new message on the front, trimmed to what is kept.
 *
 * ANSWERED ONES GO FIRST when there is not room for everything. Dropping the
 * oldest whatever it is would eventually drop somebody who is still waiting
 * for a reply, and a queue that quietly loses the thing it exists to hold is
 * worse than one that holds a shorter history.
 */
export function withMessage(rows: ContactMessage[], message: ContactMessage): ContactMessage[] {
  const all = [message, ...rows];
  if (all.length <= MOST_KEPT) return all;
  const waiting = all.filter((row) => row.state === "waiting");
  const answered = all.filter((row) => row.state !== "waiting");
  // Everything still waiting is kept even if that is the whole allowance; the
  // history is what gives way.
  return [...waiting, ...answered].slice(0, Math.max(MOST_KEPT, waiting.length));
}

/** How many are still waiting on a person. */
export function countWaiting(rows: ContactMessage[]): number {
  return rows.filter((row) => row.state === "waiting").length;
}

/**
 * What kind of thing this is, from the subject the form set.
 *
 * The three forms are three different jobs — a question, somebody wanting a
 * trip planned, somebody wanting flights booked — and the owner triaging ten
 * of these should be able to see which is which without opening each one. The
 * subjects are written by our own forms, so this reads them rather than
 * guessing; anything else is a message, which is what it is.
 */
export function kindOf(message: Pick<ContactMessage, "subject">): string {
  const subject = (message.subject ?? "").toLowerCase();
  if (subject.startsWith("flight booking request")) return "Flight request";
  if (subject.includes("trip") || subject.includes("itinerary") || subject.includes("planning")) return "Trip enquiry";
  return "Message";
}

/**
 * How long somebody has been waiting, in words.
 *
 * `now` is passed in so the answer is worked out once on the server and no
 * component reaches for a clock while it renders.
 */
export function waitingFor(at: string, now: string): string {
  const then = Date.parse(at);
  const stamp = Date.parse(now);
  if (Number.isNaN(then) || Number.isNaN(stamp)) return "at some point";
  const hours = Math.floor((stamp - then) / 3_600_000);
  if (hours < 1) return "in the last hour";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * What the dashboard says about the queue, or null when it should say nothing.
 *
 * IT NAMES THE OLDEST ONE'S AGE, not just the count. "4 messages waiting" and
 * "4 messages waiting, the oldest 6 days ago" are the same fact and only one
 * of them gets answered today.
 */
export function messagesAlert(rows: ContactMessage[], now: string): string | null {
  const waiting = rows.filter((row) => row.state === "waiting");
  if (waiting.length === 0) return null;
  const oldest = waiting.reduce((worst, row) => (Date.parse(row.at) < Date.parse(worst.at) ? row : worst));
  const many = waiting.length === 1 ? "1 message" : `${waiting.length} messages`;
  return `${many} sent in from the website ${waiting.length === 1 ? "is" : "are"} waiting for an answer — the oldest ${waitingFor(oldest.at, now)}.`;
}
