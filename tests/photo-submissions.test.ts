import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dataUrlBytes,
  isVisitorSubmission,
  oldestFirst,
  submissionProblem,
  submissionReply,
  submitterLine,
  townPictureTargets,
} from "@/lib/photo-submissions";

/**
 * The owner set one condition: he confirms before anything a stranger sends
 * appears on the site. These tests are about the rules that stand between a
 * public form and a published photograph.
 */

const good = {
  ownerKind: "cemetery",
  ownerRef: "lizhensk",
  name: "A. Klein",
  email: "a@example.com",
  credit: "A. Klein",
  caption: "The gate",
  note: "",
  permission: true,
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
};

describe("what a submission has to carry", () => {
  it("accepts a complete one", () => {
    assert.equal(submissionProblem(good), null);
  });

  it("needs to know what the picture is of", () => {
    assert.match(submissionProblem({ ...good, ownerRef: "" })!, /what this is a picture of/i);
    assert.match(submissionProblem({ ...good, ownerKind: "provider" })!, /what this is a picture of/i);
  });

  it("needs a name and a real address to reply to", () => {
    assert.match(submissionProblem({ ...good, name: "  " })!, /your name/i);
    assert.match(submissionProblem({ ...good, email: "not-an-address" })!, /email/i);
  });

  it("needs an actual picture", () => {
    assert.match(submissionProblem({ ...good, dataUrl: "" })!, /choose a picture/i);
  });

  it("will not take one without a credit", () => {
    // A photograph belongs to whoever took it. The site cannot publish one on
    // the strength of having been sent it.
    assert.match(submissionProblem({ ...good, credit: "" })!, /who took/i);
    assert.match(submissionProblem({ ...good, credit: "   " })!, /who took/i);
  });

  it("asks permission SEPARATELY from the credit", () => {
    // These look like one question and are not. Somebody can honestly name a
    // photographer and still have no right to hand the picture over — which is
    // most of how a photograph ends up published without permission.
    assert.equal(submissionProblem({ ...good, credit: "Somebody else", permission: true }), null);
    assert.match(submissionProblem({ ...good, credit: "Somebody else", permission: false })!, /may share it/i);
  });

  it("reports one problem, not a list", () => {
    // The message is about the box you are looking at.
    const problem = submissionProblem({ ownerKind: "cemetery", ownerRef: "x" });
    assert.equal(typeof problem, "string");
    assert.ok(!problem!.includes("\n"));
  });
});

describe("telling a stranger's picture from the owner's own", () => {
  it("is decided by submittedAt and nothing else", () => {
    assert.equal(isVisitorSubmission({ submittedAt: new Date() }), true);
    assert.equal(isVisitorSubmission({ submittedAt: "2026-07-31T10:00:00Z" }), true);
    assert.equal(isVisitorSubmission({ submittedAt: null }), false);
    assert.equal(isVisitorSubmission({}), false);
  });

  it("names who sent it, however little they gave", () => {
    assert.equal(submitterLine({ submittedBy: "A. Klein", submittedEmail: "a@example.com" }), "A. Klein · a@example.com");
    assert.equal(submitterLine({ submittedBy: "A. Klein", submittedEmail: null }), "A. Klein");
    assert.equal(submitterLine({ submittedBy: null, submittedEmail: "a@example.com" }), "a@example.com");
    assert.equal(submitterLine({}), "somebody who left no name");
  });
});

describe("the queue", () => {
  it("puts the person who has waited longest first", () => {
    // A list that is supposed to reach zero, not a feed.
    const sorted = oldestFirst([
      { id: "new", submittedAt: "2026-07-30T00:00:00Z" },
      { id: "old", submittedAt: "2026-07-01T00:00:00Z" },
      { id: "middle", submittedAt: "2026-07-15T00:00:00Z" },
    ]);
    assert.deepEqual(sorted.map((s) => s.id), ["old", "middle", "new"]);
  });

  it("does not mutate what it was given", () => {
    const input = [{ id: "b", submittedAt: "2026-07-30" }, { id: "a", submittedAt: "2026-07-01" }];
    oldestFirst(input);
    assert.equal(input[0].id, "b");
  });
});

describe("what a town's page offers", () => {
  it("puts the town first, then its listings", () => {
    const targets = townPictureTargets({ slug: "krakow", city: "Kraków" }, [
      { id: "p1", name: "Hotel Sanz" },
      { id: "p2", name: "The Rema shul" },
    ]);
    assert.deepEqual(targets.map((t) => t.kind), ["destination", "place", "place"]);
    assert.equal(targets[0].ref, "krakow");
    assert.match(targets[0].label, /Kraków/);
    assert.equal(targets[1].ref, "p1");
  });

  it("offers the town alone when there are no listings", () => {
    const targets = townPictureTargets({ slug: "belz", city: "Belz" }, []);
    assert.equal(targets.length, 1);
  });
});

describe("writing back", () => {
  it("drafts a refusal that carries the reason and claims nothing else", () => {
    const reply = submissionReply(
      { submittedBy: "A. Klein", submittedEmail: "a@example.com", caption: "the gate" },
      "declined",
      "It is too dark to make anything out.",
    );
    assert.match(reply.subject, /the gate/);
    assert.match(reply.body, /not putting this one up/i);
    assert.match(reply.body, /too dark/);
    assert.match(reply.href, /^mailto:a%40example\.com\?/);
  });

  it("says thank you when it went up", () => {
    const reply = submissionReply({ submittedBy: "A", submittedEmail: "a@b.co", caption: null }, "published", "");
    assert.match(reply.body, /on the site now/i);
    assert.match(reply.body, /credit under it/i);
  });
});

describe("measuring the picture before storing it", () => {
  it("reads the real size out of a data URL", () => {
    // 4 base64 characters carry 3 bytes; the padding is not data. The point of
    // a size limit is not to find out afterwards.
    assert.equal(dataUrlBytes("data:image/png;base64,AAAA"), 3);
    assert.equal(dataUrlBytes("data:image/png;base64,AAAAAA=="), 4);
    assert.equal(dataUrlBytes("data:image/png;base64,AAAAAAA="), 5);
    assert.equal(dataUrlBytes("data:image/png;base64,"), 0);

    // And a real one, measured against what it actually decodes to.
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAHElEQVQI12P8//8/AzbAxIAHjEqOSo5KjkoOSwIAcCUEAWa2A9EAAAAASUVORK5CYII=";
    assert.equal(dataUrlBytes(`data:image/png;base64,${png}`), Buffer.from(png, "base64").length);
  });
});
