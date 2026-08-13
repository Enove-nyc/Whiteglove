import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  type ContactMessage,
  MOST_KEPT,
  countWaiting,
  kindOf,
  messagesAlert,
  newMessage,
  readMessage,
  waitingFor,
  withMessage,
} from "@/lib/contact-messages";

/**
 * Keeping what people write on the website.
 *
 * THIS EXISTS BECAUSE A MESSAGE USED TO BE AN EMAIL AND NOTHING ELSE. All
 * three public forms — the contact page, the trip enquiry, the flight booking
 * request — posted to /api/contact, which handed the words to Resend and wrote
 * them down nowhere. With no email service connected the visitor was told "we
 * couldn't send your message" and their words were gone, and the admin could
 * not have told you whether anybody had written in at all.
 */

const ROUTE = readFileSync("app/api/contact/route.ts", "utf8");
const DASHBOARD = readFileSync("app/admin/page.tsx", "utf8");
const CONNECTIONS = readFileSync("lib/connections.ts", "utf8");

const stamp = (hoursAgo: number) => new Date(Date.parse(NOW) - hoursAgo * 3_600_000).toISOString();
const NOW = "2026-08-09T12:00:00.000Z";

function make(overrides: Partial<ContactMessage> = {}): ContactMessage {
  return {
    id: overrides.id ?? "m1",
    at: overrides.at ?? stamp(1),
    name: overrides.name ?? "Yossi",
    email: overrides.email ?? "yossi@example.com",
    phone: overrides.phone,
    subject: overrides.subject,
    message: overrides.message ?? "Can you plan Lizhensk to Uman?",
    state: overrides.state ?? "waiting",
    answeredAt: overrides.answeredAt,
    answeredBy: overrides.answeredBy,
  };
}

describe("reading what a form sent", () => {
  it("takes a name, an email and a message", () => {
    const read = readMessage({ name: " Yossi ", email: "yossi@example.com", message: "  Hello  " });
    assert.ok("fields" in read);
    assert.equal(read.fields.name, "Yossi");
    assert.equal(read.fields.message, "Hello");
  });

  it("refuses the three that are required, in the words the visitor already saw", () => {
    // Not a rewording exercise: this message is what the contact page has
    // always said, and the forms show whatever comes back from here.
    for (const missing of [
      { email: "a@b.com", message: "hi" },
      { name: "Yossi", message: "hi" },
      { name: "Yossi", email: "a@b.com" },
    ]) {
      const read = readMessage(missing);
      assert.ok("problem" in read);
      assert.equal(read.problem, "Please add your name, email, and a message.");
    }
  });

  it("refuses an address that is not one", () => {
    const read = readMessage({ name: "Yossi", email: "yossi at example", message: "hi" });
    assert.ok("problem" in read);
    assert.match(read.problem, /valid email/);
  });

  it("KEEPS THE LINE BREAKS IN THE MESSAGE", () => {
    // A flight request writes itself out over a dozen lines — from, to, dates,
    // cabin, baggage. Collapsing the whitespace the way the other fields are
    // collapsed would turn the only readable thing in the queue into a wall.
    const read = readMessage({ name: "Yossi", email: "a@b.com", message: "From: JFK\nTo: KRK\n\nCabin: economy" });
    assert.ok("fields" in read);
    assert.equal(read.fields.message, "From: JFK\nTo: KRK\n\nCabin: economy");
  });

  it("collapses the one-line fields and caps every one of them", () => {
    const read = readMessage({
      name: "Yossi   ben   Dovid",
      email: "a@b.com",
      subject: "x".repeat(400),
      message: "hi",
    });
    assert.ok("fields" in read);
    assert.equal(read.fields.name, "Yossi ben Dovid");
    assert.equal(read.fields.subject?.length, 160);
  });

  it("leaves an empty phone and subject unset rather than empty", () => {
    const read = readMessage({ name: "Yossi", email: "a@b.com", phone: "  ", subject: "", message: "hi" });
    assert.ok("fields" in read);
    assert.equal(read.fields.phone, undefined);
    assert.equal(read.fields.subject, undefined);
  });

  it("survives a body that is not an object at all", () => {
    const read = readMessage({});
    assert.ok("problem" in read);
  });
});

describe("the queue", () => {
  it("puts the newest first", () => {
    const rows = withMessage([make({ id: "old" })], make({ id: "new" }));
    assert.equal(rows[0].id, "new");
    assert.equal(rows.length, 2);
  });

  it("drops the answered ones first when it is full", () => {
    // The history gives way. Dropping the oldest whatever it is would
    // eventually drop somebody still waiting for a reply, which is the one
    // thing this queue exists to prevent.
    const answered = Array.from({ length: MOST_KEPT }, (_, i) =>
      make({ id: `a${i}`, state: "answered", at: stamp(500 + i) }),
    );
    const waiting = make({ id: "waiting", at: stamp(400) });
    const rows = withMessage([...answered, waiting], make({ id: "fresh" }));
    assert.equal(rows.length, MOST_KEPT);
    assert.ok(rows.some((r) => r.id === "waiting"), "somebody still waiting was dropped to make room");
    assert.ok(rows.some((r) => r.id === "fresh"));
  });

  it("NEVER DROPS SOMEBODY WHO IS STILL WAITING, even past the limit", () => {
    const waiting = Array.from({ length: MOST_KEPT + 5 }, (_, i) => make({ id: `w${i}`, at: stamp(i + 2) }));
    const rows = withMessage(waiting, make({ id: "fresh" }));
    assert.equal(countWaiting(rows), MOST_KEPT + 6);
  });

  it("counts only the ones nobody has dealt with", () => {
    assert.equal(countWaiting([make(), make({ id: "b", state: "answered" })]), 1);
  });
});

describe("what the owner is told", () => {
  it("says nothing when nothing is waiting", () => {
    assert.equal(messagesAlert([], NOW), null);
    assert.equal(messagesAlert([make({ state: "answered" })], NOW), null);
  });

  it("NAMES THE AGE OF THE OLDEST, not only the count", () => {
    // "4 messages waiting" and "4 messages waiting, the oldest 6 days ago" are
    // the same fact and only one of them gets answered today.
    const said = messagesAlert([make({ id: "a", at: stamp(2) }), make({ id: "b", at: stamp(24 * 6) })], NOW);
    assert.ok(said);
    assert.match(said, /2 messages/);
    assert.match(said, /6 days ago/);
  });

  it("counts one as one", () => {
    const said = messagesAlert([make({ at: stamp(30) })], NOW);
    assert.ok(said);
    assert.match(said, /1 message .* is waiting/);
    assert.match(said, /yesterday/);
  });

  it("puts it on the dashboard, linked to the screen that holds them", () => {
    assert.match(DASHBOARD, /messagesAlert\(/);
    assert.match(DASHBOARD, /href: "\/admin\/messages"/);
  });
});

describe("telling the three forms apart", () => {
  it("reads the subject our own forms set", () => {
    assert.equal(kindOf({ subject: "Flight booking request — JFK → KRK" }), "Flight request");
    assert.equal(kindOf({ subject: "Trip planning enquiry" }), "Trip enquiry");
    assert.equal(kindOf({ subject: "A question about Uman" }), "Message");
    assert.equal(kindOf({}), "Message");
  });
});

describe("how long they have waited", () => {
  it("says it the way a person would", () => {
    assert.equal(waitingFor(stamp(0.2), NOW), "in the last hour");
    assert.equal(waitingFor(stamp(5), NOW), "5 hours ago");
    assert.equal(waitingFor(stamp(30), NOW), "yesterday");
    assert.equal(waitingFor(stamp(24 * 9), NOW), "9 days ago");
  });

  it("does not invent a number from an unreadable date", () => {
    assert.equal(waitingFor("whenever", NOW), "at some point");
  });
});

describe("a new message", () => {
  it("starts as waiting", () => {
    const message = newMessage({ name: "Yossi", email: "a@b.com", message: "hi" }, "id1", NOW);
    assert.equal(message.state, "waiting");
    assert.equal(message.at, NOW);
  });
});

describe("the route decides whether a message survives", () => {
  it("SAVES IT BEFORE IT EMAILS IT", () => {
    // The order is the whole point. Emailing first and saving second means a
    // message the owner has been told about may not be in the queue he works
    // from, which is how somebody gets answered twice or not at all.
    const savedAt = ROUTE.indexOf("saveContactMessage(");
    const sentAt = ROUTE.indexOf("sendContactMessage(");
    assert.ok(savedAt !== -1, "nothing saves the message");
    assert.ok(sentAt !== -1, "nothing emails the message");
    assert.ok(savedAt < sentAt, "the email is sent before the message is saved");
  });

  it("DOES NOT AWAIT THE EMAIL once the message is saved", () => {
    // It is already safe. An email service that is slow or away must not turn
    // a saved message into an error the person sees — they would write it
    // again, and again.
    assert.match(ROUTE, /void sendContactMessage/);
  });

  it("swallows a failed send rather than throwing into the response", () => {
    const at = ROUTE.indexOf("void sendContactMessage");
    assert.match(ROUTE.slice(at, at + 200), /\.catch\(/);
  });

  it("STILL AWAITS THE EMAIL WHEN NOTHING SAVED IT, because then it is the only copy", () => {
    // With no private store connected this route has to behave exactly as it
    // did before: the email is the message, and its failure is the visitor's.
    assert.match(ROUTE, /const sent = await sendContactMessage/);
    assert.match(ROUTE, /if \(!sent\)/);
    assert.match(ROUTE, /503/);
  });

  it("keeps the words the visitor reads when it genuinely could not take it", () => {
    assert.match(ROUTE, /We couldn't send your message just now/);
  });

  it("does not answer ok on a message it neither saved nor sent", () => {
    // The failure branch must return before the success one. A route that
    // thanks somebody for a message that went nowhere is the worst version of
    // this bug, because nobody ever finds out.
    const failed = ROUTE.indexOf("status: 503");
    const ok = ROUTE.lastIndexOf("ok: true");
    assert.ok(failed !== -1 && ok > failed);
  });
});

describe("what the connections screen promises", () => {
  it("no longer claims contact messages are saved when they are only emailed", () => {
    // This line was untrue for the whole of the site's life: it said contact
    // messages were "still saved to the admin" without the email, and nothing
    // saved them anywhere. It is true now, and says where they are.
    assert.match(CONNECTIONS, /Settings → Messages/);
    assert.doesNotMatch(CONNECTIONS, /Contact messages and suggestions are still saved to the admin/);
  });

  it("says what the private store being away costs a message", () => {
    assert.match(CONNECTIONS, /message written on the contact form is emailed and kept nowhere/);
  });
});
