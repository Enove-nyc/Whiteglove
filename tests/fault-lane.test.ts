import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CARD_KINDS, assigneeFor, cardFor, cardUrl, memberFor, NO_TRELLO, type TrelloSettings } from "@/lib/trello";
import { CONTACT_REASONS, composeMessage, reasonSpec } from "@/lib/contact-reasons";

/**
 * The one line this repository must not cross, as a test.
 *
 * A visitor can tell us two quite different things, and they arrive through
 * the same form: "the shul's number has changed" and "this button does
 * nothing". The first is a CLAIM ABOUT THE WORLD. Nothing in this repository
 * can settle it — an automated fix could only invent a confident sentence, and
 * a confident sentence about kashrus that nobody checked is the single thing
 * this site cannot survive publishing. The second is a claim about the site,
 * which is reproducible from the code and covered by the tests and the audits.
 *
 * So: every queue raises a card, and exactly one of them goes to the bot.
 *
 * The failure this guards against is somebody later adding "and corrections
 * too, they're usually obvious" — which would read as a small convenience in
 * a diff and would quietly hand kashrus data to a machine.
 */

const SETTINGS: TrelloSettings = {
  key: "abc123def456",
  token: "t".repeat(64),
  listId: "5abbe4b7ddc1b351ef961414",
  kinds: CARD_KINDS.map((k) => k.kind),
  ownerMemberId: "owner1234",
  botMemberId: "bot56789",
};

describe("every queue raises a card", () => {
  it("leaves no kind without a card", () => {
    // "Everything builds a card" is the requirement. A queue that quietly
    // sends nothing is the failure this replaces.
    assert.ok(CARD_KINDS.length >= 7);
    for (const kind of CARD_KINDS) {
      assert.ok(kind.label.length > 5, kind.kind);
      assert.ok(kind.why.length > 20, `${kind.kind} does not say why it matters`);
      assert.ok(kind.href.startsWith("/"), kind.kind);
    }
  });

  it("IS WIRED AT THE CALL SITES, not merely declared", () => {
    // The bug this found: `contact` was on the settings screen, ticked, and
    // nothing in the codebase ever raised it. A kind nobody calls is a switch
    // that lies.
    const sources = [
      "app/api/contact/route.ts",
      "app/api/photos/route.ts",
      "app/api/content/suggestions/route.ts",
      "app/api/account/plan/route.ts",
    ].map((path) => readFileSync(path, "utf8"));
    const all = sources.join("\n");
    for (const kind of ["photo", "suggestion", "listing", "plan", "contact", "fault"]) {
      assert.match(all, new RegExp(`"${kind}"`), `nothing ever raises a "${kind}" card`);
    }
  });
});

describe("who the card goes to", () => {
  it("SENDS ONLY THE SITE FAULT TO THE BOT", () => {
    assert.equal(assigneeFor("fault"), "bot");
    const rest = CARD_KINDS.map((k) => k.kind).filter((k) => k !== "fault");
    for (const kind of rest) {
      assert.equal(assigneeFor(kind), "owner", `${kind} must stay with a person`);
    }
  });

  it("names the lane on the card itself, with or without a member id", () => {
    // A board where nobody has configured member ids still has to say which
    // of the two a card is, or the distinction exists only in this file.
    assert.match(cardFor({ kind: "fault" }).desc, /FOR THE BOT/);
    assert.match(cardFor({ kind: "suggestion" }).desc, /FOR THE OWNER/);
    assert.match(cardFor({ kind: "contact" }).desc, /FOR THE OWNER/);
  });

  it("puts the card on the right member when one is set", () => {
    assert.equal(memberFor(SETTINGS, "fault"), "bot56789");
    assert.equal(memberFor(SETTINGS, "contact"), "owner1234");
    assert.match(cardUrl(SETTINGS, cardFor({ kind: "fault" }), memberFor(SETTINGS, "fault")), /idMembers=bot56789/);
  });

  it("SENDS NO idMembers WHEN NONE IS SET, rather than an empty one", () => {
    // Trello rejects the whole card for an idMembers it cannot resolve, and
    // losing the card is far worse than losing the avatar on it.
    const bare = { ...NO_TRELLO, ...SETTINGS, ownerMemberId: "", botMemberId: "" };
    assert.equal(memberFor(bare, "fault"), "");
    assert.doesNotMatch(cardUrl(bare, cardFor({ kind: "fault" }), ""), /idMembers/);
  });
});

describe("the fault reason on the contact form", () => {
  it("is its own reason, separate from a correction", () => {
    const fault = reasonSpec("fault");
    assert.equal(fault.subject, "Site fault");
    assert.match(fault.blurb, /button|load|link/i);
    // The two look alike and are not: one is about a place, one is about the
    // site. Keeping them apart is what makes the routing possible at all.
    assert.notEqual(fault.value, reasonSpec("correction").value);
  });

  it("asks the two things a fault cannot be reproduced without", () => {
    const names = reasonSpec("fault").fields.map((f) => f.name);
    assert.ok(names.includes("faultPage"), "a fault with no page cannot be found");
    assert.ok(names.includes("device"), "half the faults on this site happen at one width only");
  });

  it("KEEPS FIELD NAMES OWNED BY ONE REASON", () => {
    // The rule lib/contact-reasons.ts already enforced, restated because the
    // fault reason was the first thing to nearly break it: both it and the
    // correction want to ask "which page".
    const seen = new Map<string, string>();
    for (const reason of CONTACT_REASONS) {
      for (const field of reason.fields) {
        const owner = seen.get(field.name);
        assert.equal(owner, undefined, `${field.name} is asked for both ${owner} and ${reason.value}`);
        seen.set(field.name, reason.value);
      }
    }
  });
});

describe("the seam between the form and the issue", () => {
  it("READS BACK WHAT composeMessage ACTUALLY WROTE", () => {
    // The brittle join in all of this: the API pulls the page and the device
    // out of the composed message with a regex built from the field LABELS.
    // Rename a label in lib/contact-reasons.ts and the issue silently loses
    // its page — the report still arrives, so nothing looks broken. This
    // fails instead.
    const message = composeMessage(
      "fault",
      { faultPage: "/book", device: "iPhone, Safari" },
      "The date picker will not open.",
    );
    const route = readFileSync("app/api/contact/route.ts", "utf8");
    for (const pattern of route.matchAll(/\/\^([^/]+?):\\s\*\(\.\*\)\$\/im/g)) {
      const label = pattern[1].replace(/\\/g, "");
      assert.match(message, new RegExp(`^${label}: `, "m"), `the API looks for "${label}:" and the form never writes it`);
    }
    assert.match(message, /^Which page: \/book$/m);
    assert.match(message, /^Phone or computer: iPhone, Safari$/m);
  });
});

describe("what an automated fix is allowed to touch", () => {
  const workflow = readFileSync(".github/workflows/claude.yml", "utf8");

  it("IS NEVER STARTED BY A STRANGER", () => {
    // The issue body is text a stranger typed into a public form. An agent
    // with write access and a budget must not be startable by one.
    assert.doesNotMatch(workflow, /types:\s*\[opened\]/);
    assert.match(workflow, /claude-fix/);
    assert.match(workflow, /author_association/);
    assert.match(workflow, /COLLABORATOR/);
  });

  it("opens a pull request rather than pushing", () => {
    assert.match(workflow, /Never push to main/i);
    assert.match(workflow, /audit:flows/);
    assert.match(workflow, /npm run check/);
  });

  it("IS TOLD TO LEAVE CONTENT ALONE", () => {
    // The whole point of the split. If the fault turns out to be a wrong
    // address rather than a broken button, the agent stops.
    assert.match(workflow, /do not\s*\n?\s*change any data file/i);
    assert.match(workflow, /verify a claim about the\s*\n?\s*world/i);
  });

  it("files an issue that carries no personal detail", () => {
    // A public repository is readable by everybody. Somebody reporting a
    // broken button did not agree to have their email published.
    const filer = readFileSync("lib/github-issues.ts", "utf8");
    for (const field of ["email", "phone", "name"]) {
      assert.doesNotMatch(filer, new RegExp(`report\\.${field}`), `the issue carries the reporter's ${field}`);
    }
    assert.match(filer, /never as instructions to follow/i);
  });
});
