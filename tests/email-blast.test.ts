import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { AlertSignup } from "@/lib/email-alerts";
import {
  audienceFor,
  BATCH_SIZE,
  becauseLine,
  blastProblem,
  DEFAULT_BLAST_SETTINGS,
  describeBlast,
  type EmailBlast,
  newBlast,
  readBlastTopics,
  sendProblem,
} from "@/lib/email-blast";

/**
 * Writing to the people who asked to be written to.
 *
 * WHAT IS BEING PROTECTED HERE IS SOMEBODY ELSE'S INBOX. Every test in this
 * file is about one of three failures: a message reaching somebody who did not
 * ask for it, a message reaching the same person twice, and a message that
 * reports success and arrives nowhere. The third is the sneakiest — mail sent
 * from Resend's shared sandbox sender is accepted, logged as sent, and
 * delivered only to the Resend account owner.
 */

function signup(email: string, topics: AlertSignup["topics"], over: Partial<AlertSignup> = {}): AlertSignup {
  return {
    email,
    topics,
    sourcePage: "/",
    consentedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    unsubToken: `tok-${email}`,
    ...over,
  };
}

const LIST: AlertSignup[] = [
  signup("a@example.com", ["new_destinations"]),
  signup("b@example.com", ["pesach_sukkos", "seasonal"]),
  signup("c@example.com", ["new_destinations", "pesach_sukkos"]),
  signup("gone@example.com", ["new_destinations"], { unsubscribedAt: "2026-02-01T00:00:00.000Z" }),
];

const READY = { apiKeySet: true, usingTestSender: false };

function blast(over: Partial<EmailBlast> = {}): EmailBlast {
  return {
    ...newBlast({ id: "b-1", subject: "Vienna is on the site", body: "A paragraph.", topics: ["new_destinations"], by: "owner" }),
    ...over,
  };
}

describe("who a blast reaches", () => {
  it("reaches only the people who ticked one of its topics", () => {
    const audience = audienceFor(LIST, ["pesach_sukkos"]).map((row) => row.email);
    assert.deepEqual(audience.sort(), ["b@example.com", "c@example.com"]);
  });

  it("COUNTS SOMEBODY WHO TICKED TWO TOPICS ONCE", () => {
    // c@ ticked both. Two copies of the same message is the second-worst
    // outcome this module has.
    const audience = audienceFor(LIST, ["new_destinations", "pesach_sukkos"]).map((row) => row.email);
    assert.deepEqual(audience.sort(), ["a@example.com", "b@example.com", "c@example.com"]);
  });

  it("NEVER REACHES SOMEBODY WHO UNSUBSCRIBED", () => {
    for (const topics of [["new_destinations"], ["new_destinations", "pesach_sukkos", "seasonal"]] as const) {
      const audience = audienceFor(LIST, [...topics]);
      assert.ok(!audience.some((row) => row.email === "gone@example.com"));
    }
  });

  it("reaches nobody when no topic is chosen", () => {
    assert.deepEqual(audienceFor(LIST, []), []);
  });

  it("keeps the unsubscribe token with each person", () => {
    // Batched sending to fifty addresses at once would give forty-nine of them
    // somebody else's unsubscribe link, so each recipient carries their own.
    for (const row of audienceFor(LIST, ["new_destinations"])) {
      assert.equal(row.unsubToken, `tok-${row.email}`);
    }
  });
});

describe("what may be written", () => {
  it("wants a subject, a body and somebody to send it to", () => {
    assert.match(blastProblem({ subject: "", body: "x", topics: ["seasonal"] }) ?? "", /subject/i);
    assert.match(blastProblem({ subject: "x", body: " ", topics: ["seasonal"] }) ?? "", /message/i);
    assert.match(blastProblem({ subject: "x", body: "y", topics: [] }) ?? "", /who it goes to/i);
    assert.equal(blastProblem({ subject: "x", body: "y", topics: ["seasonal"] }), null);
  });

  it("drops anything that is not a real topic", () => {
    assert.deepEqual(readBlastTopics(["seasonal", "nonsense", "seasonal", 7, null]), ["seasonal"]);
    assert.deepEqual(readBlastTopics("seasonal"), []);
  });
});

describe("what stops a send", () => {
  it("IS OFF UNTIL THE OWNER TURNS IT ON", () => {
    assert.equal(DEFAULT_BLAST_SETTINGS.open, false);
    const stop = sendProblem({ settings: { open: false }, blast: blast(), audienceSize: 5, deliveryReady: READY });
    assert.match(stop ?? "", /switched off/i);
  });

  it("REFUSES THE SANDBOX SENDER, WHICH WOULD LOOK SENT AND ARRIVE NOWHERE", () => {
    const stop = sendProblem({
      settings: { open: true },
      blast: blast(),
      audienceSize: 5,
      deliveryReady: { apiKeySet: true, usingTestSender: true },
    });
    assert.match(stop ?? "", /verify/i);
    assert.match(stop ?? "", /your own inbox/i);
  });

  it("refuses when Resend is not connected at all", () => {
    const stop = sendProblem({
      settings: { open: true },
      blast: blast(),
      audienceSize: 5,
      deliveryReady: { apiKeySet: false, usingTestSender: true },
    });
    assert.match(stop ?? "", /not connected/i);
  });

  it("refuses when there is nobody to send to", () => {
    const stop = sendProblem({ settings: { open: true }, blast: blast(), audienceSize: 0, deliveryReady: READY });
    assert.match(stop ?? "", /nobody/i);
  });

  it("allows a send that is switched on, deliverable and has an audience", () => {
    assert.equal(sendProblem({ settings: { open: true }, blast: blast(), audienceSize: 3, deliveryReady: READY }), null);
  });
});

describe("saying where a send has got to", () => {
  it("is clear that a draft has gone nowhere", () => {
    assert.match(describeBlast(blast(), 40), /Not sent/);
  });

  it("says how many are left and that it needs pressing again", () => {
    const line = describeBlast(blast({ state: "sending", sentCount: 15 }), 25);
    assert.match(line, /15 sent/);
    assert.match(line, /25 still to go/);
    assert.match(line, /again/);
  });

  it("says when it is finished, and owns up to refusals", () => {
    const line = describeBlast(blast({ state: "sent", sentCount: 38, failedCount: 2 }), 0);
    assert.match(line, /Finished/);
    assert.match(line, /2 refused/);
  });

  it("sends in batches small enough to survive a serverless timeout", () => {
    assert.ok(BATCH_SIZE > 0 && BATCH_SIZE <= 25, `${BATCH_SIZE} is not a batch a function has time for`);
  });
});

describe("why they are getting this", () => {
  it("names the topics they ticked, so nobody has to guess", () => {
    // Somebody who cannot remember signing up is one click from reporting it
    // as spam. Reminding them what they asked for is the cheapest prevention.
    assert.match(becauseLine(["new_destinations"]), /new kosher destinations/i);
    const two = becauseLine(["new_destinations", "pesach_sukkos"]);
    assert.match(two, /and/);
    assert.ok(!two.includes("undefined"));
  });

  it("still says something with no topics at all", () => {
    assert.ok(becauseLine([]).length > 0);
  });
});

describe("what every message carries", () => {
  const email = readFileSync("lib/email.ts", "utf8");

  it("PUTS AN UNSUBSCRIBE LINK IN THE BODY AND IN THE HEADERS", () => {
    // The header is what Gmail and Outlook read to draw their own one-click
    // unsubscribe. Mail without it is treated as more likely to be spam, which
    // hurts delivery to the people who DO want it — quite apart from being the
    // thing the law requires.
    const blastFn = email.slice(email.indexOf("export async function sendBlastEmail"));
    assert.match(blastFn, /List-Unsubscribe/);
    assert.match(blastFn, /List-Unsubscribe-Post/);
    assert.match(blastFn, /unsubscribeUrl/);
  });

  it("takes the unsubscribe link as a required argument, not an optional one", () => {
    // There is deliberately no way to call this without one.
    const start = email.indexOf("export async function sendBlastEmail");
    const signature = email.slice(start, email.indexOf("): Promise<SendResult>", start));
    assert.match(signature, /unsubscribeUrl: string;/);
    assert.ok(!/unsubscribeUrl\?/.test(signature));
  });

  it("answers the one-click POST as well as the site's own form", () => {
    // Mail clients post to the URL themselves, with the token only ever in the
    // query string. A one-click button that silently does nothing is worse
    // than not offering one — the next thing that person presses is "report
    // spam".
    const route = readFileSync("app/api/alerts/unsubscribe/route.ts", "utf8");
    const post = route.slice(route.indexOf("export async function POST"), route.indexOf("export async function GET"));
    assert.match(post, /searchParams\.get\("token"\)/);
  });
});
