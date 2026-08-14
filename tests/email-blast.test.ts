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
  blocksOf,
  blocksProblem,
  cleanBlocks,
  senderProblem,
  sendProblem,
  splitLinks,
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
    ...newBlast({ id: "b-1", subject: "Vienna is on the site", body: "", topics: ["new_destinations"], by: "owner" }),
    blocks: [{ kind: "text", text: "A paragraph." }] as EmailBlast["blocks"],
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
  it("wants a subject and somebody to send it to", () => {
    assert.match(blastProblem({ subject: "", topics: ["seasonal"] }) ?? "", /subject/i);
    assert.match(blastProblem({ subject: "x", topics: [] }) ?? "", /who it goes to/i);
    assert.match(blastProblem({ subject: "x".repeat(200), topics: ["seasonal"] }) ?? "", /subject/i);
    assert.equal(blastProblem({ subject: "x", topics: ["seasonal"] }), null);
  });

  it("wants something in the message, and some words among it", () => {
    assert.match(blocksProblem([]) ?? "", /Add something/i);
    assert.match(blocksProblem([{ kind: "text", text: "  " }]) ?? "", /Add something/i);
    // A message that is only a picture and a button reads as an advertisement,
    // which is not what anybody ticked a box for.
    assert.match(
      blocksProblem([
        { kind: "image", url: "/api/media?id=m-1", alt: "A shul", caption: "", href: "" },
        { kind: "button", label: "Look", href: "https://example.com" },
      ]) ?? "",
      /some words/i,
    );
    assert.equal(blocksProblem([{ kind: "text", text: "Hello." }]), null);
  });

  it("REFUSES A BUTTON THAT GOES NOWHERE", () => {
    // It renders as something to press that does nothing, in somebody else's
    // inbox, where the owner will never see it happen.
    assert.match(
      blocksProblem([{ kind: "text", text: "Hi" }, { kind: "button", label: "Book", href: "  " }]) ?? "",
      /nowhere to go/i,
    );
    assert.match(
      blocksProblem([{ kind: "text", text: "Hi" }, { kind: "button", label: " ", href: "https://example.com" }]) ?? "",
      /no words on it/i,
    );
  });

  it("wants a description on every picture", () => {
    // For the people whose email does not show pictures, which is a lot of
    // people on a phone with images off.
    assert.match(
      blocksProblem([{ kind: "text", text: "Hi" }, { kind: "image", url: "/api/media?id=m", alt: "", caption: "", href: "" }]) ?? "",
      /description/i,
    );
  });

  it("opens a message written before there were blocks", () => {
    // Nothing typed in the plain-text days is lost or has to be retyped.
    assert.deepEqual(blocksOf({ body: "An old draft." }), [{ kind: "text", text: "An old draft." }]);
    assert.deepEqual(blocksOf({ body: "  " }), []);
    assert.deepEqual(blocksOf({ blocks: [{ kind: "divider" }], body: "ignored" }), [{ kind: "divider" }]);
  });

  it("drops anything that is not a block it knows", () => {
    assert.deepEqual(cleanBlocks([{ kind: "video", src: "x" }, { kind: "divider" }, null, "text"]), [{ kind: "divider" }]);
    assert.deepEqual(cleanBlocks("nonsense"), []);
  });

  it("drops anything that is not a real topic", () => {
    assert.deepEqual(readBlastTopics(["seasonal", "nonsense", "seasonal", 7, null]), ["seasonal"]);
    assert.deepEqual(readBlastTopics("seasonal"), []);
  });
});

describe("what stops a send", () => {
  it("IS OFF UNTIL THE OWNER TURNS IT ON", () => {
    assert.equal(DEFAULT_BLAST_SETTINGS.open, false);
    const stop = sendProblem({ settings: { open: false, fromEmail: "" }, blast: blast(), audienceSize: 5, deliveryReady: READY });
    assert.match(stop ?? "", /switched off/i);
  });

  it("REFUSES THE SANDBOX SENDER, WHICH WOULD LOOK SENT AND ARRIVE NOWHERE", () => {
    const stop = sendProblem({
      settings: { open: true, fromEmail: "" },
      blast: blast(),
      audienceSize: 5,
      deliveryReady: { apiKeySet: true, usingTestSender: true },
    });
    assert.match(stop ?? "", /verify/i);
    assert.match(stop ?? "", /your own inbox/i);
  });

  it("refuses when Resend is not connected at all", () => {
    const stop = sendProblem({
      settings: { open: true, fromEmail: "" },
      blast: blast(),
      audienceSize: 5,
      deliveryReady: { apiKeySet: false, usingTestSender: true },
    });
    assert.match(stop ?? "", /not connected/i);
  });

  it("refuses when there is nobody to send to", () => {
    const stop = sendProblem({ settings: { open: true, fromEmail: "" }, blast: blast(), audienceSize: 0, deliveryReady: READY });
    assert.match(stop ?? "", /nobody/i);
  });

  it("allows a send that is switched on, deliverable and has an audience", () => {
    assert.equal(sendProblem({ settings: { open: true, fromEmail: "" }, blast: blast(), audienceSize: 3, deliveryReady: READY }), null);
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

describe("links in the words", () => {
  /**
   * The messages this feature is for are about a thing that is somewhere — a
   * Pesach programme, a kosher place that has opened, a destination published.
   * "Vienna is on the site" with no way to get to Vienna makes somebody go and
   * look for it, and most of them will not. So an address pasted into the body
   * becomes a link, with no syntax for the owner to learn or get wrong.
   */
  it("finds an address on its own line", () => {
    assert.deepEqual(splitLinks("https://example.com/vienna"), [
      { text: "https://example.com/vienna", url: "https://example.com/vienna" },
    ]);
  });

  it("finds one in the middle of a sentence, keeping the words around it", () => {
    const parts = splitLinks("Vienna is up at https://example.com/vienna today.");
    assert.deepEqual(parts, [
      { text: "Vienna is up at " },
      { text: "https://example.com/vienna", url: "https://example.com/vienna" },
      { text: " today." },
    ]);
  });

  it("LEAVES THE FULL STOP OUT OF THE ADDRESS", () => {
    // "see https://example.com/vienna." must link the address, not the
    // sentence's punctuation — otherwise every link at the end of a sentence
    // is a broken link.
    const parts = splitLinks("See https://example.com/vienna.");
    assert.equal(parts[1].url, "https://example.com/vienna");
    assert.equal(parts[2].text, ".");
    for (const stop of [",", ";", ":", "!", "?"]) {
      const one = splitLinks(`See https://example.com/a${stop}`);
      assert.equal(one[1].url, "https://example.com/a", `${stop} was taken into the address`);
    }
  });

  it("keeps a closing bracket that the address itself opened", () => {
    const kept = splitLinks("https://example.com/a_(b)");
    assert.equal(kept[0].url, "https://example.com/a_(b)");
    const dropped = splitLinks("(see https://example.com/a)");
    assert.equal(dropped[1].url, "https://example.com/a");
  });

  it("finds several in one paragraph", () => {
    const parts = splitLinks("One https://a.example and two https://b.example end");
    assert.deepEqual(
      parts.filter((p) => p.url).map((p) => p.url),
      ["https://a.example", "https://b.example"],
    );
  });

  it("LINKS NOTHING BUT HTTP AND HTTPS", () => {
    // javascript: and data: in an email somebody was sent, from an address they
    // trust, is exactly the thing not to build. And a bare hostname is not
    // linked either: ordinary prose is full of things that look like one
    // ("Pesach 5787.Booking opens"), and linking those makes the message look
    // broken.
    for (const body of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "mailto:someone@example.com",
      "whitegloveitineraries.com/vienna",
      "Pesach 5787.Booking opens soon",
    ]) {
      assert.deepEqual(splitLinks(body), [{ text: body }], `${body} was turned into a link`);
    }
  });

  it("gives back the plain words when there is no address at all", () => {
    assert.deepEqual(splitLinks("Nothing to click here."), [{ text: "Nothing to click here." }]);
    assert.deepEqual(splitLinks(""), [{ text: "" }]);
  });

  it("SPLITS BEFORE ESCAPING, so an address with an & survives", () => {
    // Escaping first would turn "&" into "&amp;" inside the href and send the
    // reader somewhere else. The email builder splits, then escapes each part.
    const parts = splitLinks("Look: https://example.com/search?a=1&b=2 now");
    assert.equal(parts[1].url, "https://example.com/search?a=1&b=2");
    // The paragraph builder moved into lib/email-template.ts when the message
    // became a stack of blocks. The ordering it has to keep did not change.
    const template = readFileSync("lib/email-template.ts", "utf8");
    const fn = template.slice(template.indexOf("function paragraphHtml"));
    assert.ok(fn.indexOf("splitLinks(block)") < fn.indexOf("escapeEmailHtml(segment.text)"));
    assert.match(fn, /safeHref\(segment\.url\)/);
  });
});

describe("who an update comes from", () => {
  /**
   * TWO KINDS OF MAIL, TWO ADDRESSES. A six-digit code comes from noreply@
   * because there is nothing to reply to. An update about a Pesach programme is
   * a letter somebody WILL answer, and the answer has to reach a mailbox a
   * person opens.
   */
  it("allows blank, which means the site's usual sender", () => {
    assert.equal(senderProblem("", "whitegloveitineraries.com"), null);
    assert.equal(senderProblem("   ", "whitegloveitineraries.com"), null);
  });

  it("allows an address on the verified domain, named or bare", () => {
    assert.equal(senderProblem("info@whitegloveitineraries.com", "whitegloveitineraries.com"), null);
    assert.equal(senderProblem("White Glove <info@whitegloveitineraries.com>", "whitegloveitineraries.com"), null);
    assert.equal(senderProblem("info@mail.whitegloveitineraries.com", "whitegloveitineraries.com"), null);
  });

  it("REFUSES A DOMAIN RESEND HAS NOT BEEN SHOWN CONTROL OF", () => {
    // Sending as an unverified domain is refused at the API in the good case
    // and, in the bad one, accepted and then binned by the receiving server for
    // failing DKIM — which from this end looks exactly like a successful send.
    const problem = senderProblem("info@gmail.com", "whitegloveitineraries.com");
    assert.match(problem ?? "", /whitegloveitineraries\.com/);
    assert.match(senderProblem("info@notourdomain.com", "whitegloveitineraries.com") ?? "", /spam|refused/i);
    // And not a lookalike that merely ends with the right letters.
    assert.ok(senderProblem("info@evilwhitegloveitineraries.com", "whitegloveitineraries.com"));
  });

  it("refuses something that is not an address at all", () => {
    assert.match(senderProblem("info", "whitegloveitineraries.com") ?? "", /not an email address/i);
    assert.match(senderProblem("White Glove <not-an-address>", "whitegloveitineraries.com") ?? "", /not an email address/i);
  });

  it("sends as that address and takes replies there", () => {
    const email = readFileSync("lib/email.ts", "utf8");
    const fn = email.slice(email.indexOf("export async function sendBlastEmail"));
    assert.match(fn, /blastSender\(input\.from/);
    assert.match(fn, /reply_to/);
  });

  it("gives a bare address a name, so it reads as a letter not a circular", () => {
    assert.match(readFileSync("lib/email.ts", "utf8"), /White Glove Itineraries <\$\{clean\}>/);
  });
});
