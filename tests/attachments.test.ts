import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTACHMENT_KINDS,
  MAX_ATTACHMENT_BYTES,
  MAX_PER_ITEM,
  attachmentProblem,
  countAttachments,
  dataUrlBytes,
  dataUrlType,
  describeAttachment,
  describeSize,
  opensInTheBrowser,
  withoutAttachments,
  type Attachment,
} from "@/lib/attachments";

/**
 * A boarding pass, a ticket, a booking — kept with the stop it belongs to.
 *
 * The planner could say the flight leaves at 07:15 and the kever opens at
 * nine, and then the traveller stood at the gate going through their email for
 * the pass.
 *
 * Two things must not go wrong, and both are about the pass being sensitive
 * rather than about it being a file. A boarding pass carries a full name and a
 * booking reference, which between them are enough to change or cancel a
 * flight. So it must never leave with a shared trip, and an SVG must never be
 * accepted as "a picture".
 */

const pdf = (bytes: number) => `data:application/pdf;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

function file(over: Partial<Attachment> = {}): Attachment {
  return {
    id: over.id ?? "att-1",
    kind: over.kind ?? "boarding-pass",
    name: over.name ?? "KRK-TLV.pdf",
    contentType: over.contentType ?? "application/pdf",
    bytes: over.bytes ?? 182 * 1024,
    addedAt: over.addedAt ?? "2026-08-01T09:00:00.000Z",
    note: over.note,
  };
}

describe("reading a data URL without decoding it", () => {
  it("works the size out from the base64 itself", () => {
    // Checked from the data rather than from a number the browser sent
    // alongside it: the number is the part somebody could change.
    assert.equal(dataUrlBytes("data:application/pdf;base64,QUJD"), 3);
    assert.equal(dataUrlBytes("data:application/pdf;base64,QUJDRA=="), 4);
    assert.equal(dataUrlBytes("data:application/pdf;base64,QUJDREU="), 5);
    assert.equal(dataUrlBytes("not a data url"), 0);
  });

  it("reads the type it declares", () => {
    assert.equal(dataUrlType("data:application/pdf;base64,QQ=="), "application/pdf");
    assert.equal(dataUrlType("DATA:IMAGE/PNG;base64,QQ=="), "image/png");
    assert.equal(dataUrlType("rubbish"), "");
  });
});

describe("what may be attached", () => {
  it("takes a boarding pass", () => {
    assert.equal(attachmentProblem({ name: "KRK-TLV.pdf", dataUrl: pdf(120 * 1024), kind: "boarding-pass" }), null);
  });

  it("refuses an SVG rather than treating it as a picture", () => {
    // An SVG is a document that can carry script and fetch from elsewhere.
    // The same rule the hechsher marks follow.
    const said = attachmentProblem({ name: "ticket.svg", dataUrl: "data:image/svg+xml;base64,QQ==" });
    assert.match(said ?? "", /SVG files are not accepted/);
  });

  it("refuses anything that is not a PDF or a picture", () => {
    assert.match(attachmentProblem({ name: "x.zip", dataUrl: "data:application/zip;base64,QQ==" }) ?? "", /PDF or a picture/);
    assert.match(attachmentProblem({ name: "x.html", dataUrl: "data:text/html;base64,QQ==" }) ?? "", /PDF or a picture/);
  });

  it("refuses one that is too big, and says what to do", () => {
    const said = attachmentProblem({ name: "photo.pdf", dataUrl: pdf(MAX_ATTACHMENT_BYTES + 5000) });
    assert.match(said ?? "", /too big/);
    assert.match(said ?? "", /the airline sent/);
  });

  it("takes one right on the limit", () => {
    assert.equal(attachmentProblem({ name: "big.pdf", dataUrl: pdf(MAX_ATTACHMENT_BYTES - 8) }), null);
  });

  it("refuses an empty file and a nameless one", () => {
    assert.match(attachmentProblem({ name: "x.pdf", dataUrl: "data:application/pdf;base64," }) ?? "", /came through empty/);
    assert.match(attachmentProblem({ name: "  ", dataUrl: pdf(100) }) ?? "", /no name/);
    assert.match(attachmentProblem({ name: "x.pdf" }) ?? "", /Choose a file/);
  });

  it("stops a stop filling up without bound", () => {
    const said = attachmentProblem({ name: "x.pdf", dataUrl: pdf(100), existingCount: MAX_PER_ITEM });
    assert.match(said ?? "", new RegExp(`already has ${MAX_PER_ITEM}`));
    assert.equal(attachmentProblem({ name: "x.pdf", dataUrl: pdf(100), existingCount: MAX_PER_ITEM - 1 }), null);
  });

  it("refuses a kind nobody offers", () => {
    assert.match(attachmentProblem({ name: "x.pdf", dataUrl: pdf(100), kind: "passport" }) ?? "", /what kind of thing/);
    for (const kind of ATTACHMENT_KINDS) {
      assert.equal(attachmentProblem({ name: "x.pdf", dataUrl: pdf(100), kind }), null, kind);
    }
  });
});

describe("how it reads", () => {
  it("says the size the way a person would", () => {
    assert.equal(describeSize(400), "400 B");
    assert.equal(describeSize(182 * 1024), "182 KB");
    assert.equal(describeSize(1.5 * 1024 * 1024), "1.5 MB");
  });

  it("names what it is, what it is called and how big", () => {
    assert.equal(describeAttachment(file()), "Boarding pass · KRK-TLV.pdf · 182 KB");
    assert.match(describeAttachment(file({ kind: "ticket", name: "Wawel.pdf" })), /^Ticket · Wawel\.pdf/);
  });

  it("knows what a browser will show rather than download", () => {
    assert.equal(opensInTheBrowser("application/pdf"), true);
    assert.equal(opensInTheBrowser("image/png"), true);
    assert.equal(opensInTheBrowser("application/zip"), false);
  });
});

describe("a trip that leaves the account", () => {
  const trip = {
    title: "Poland",
    flights: [{ id: "f1", from: "JFK", attachments: [file()] }],
    lodging: [{ id: "l1", name: "Hotel", attachments: [file({ kind: "booking" })] }],
    activities: [{ id: "a1", name: "Lizhensk", attachments: [file({ kind: "ticket" })] }, { id: "a2", name: "Uman" }],
  };

  it("carries no attachment at all", () => {
    // The reference alone would not fetch the file — serving checks the owner
    // — but stripping it as well means the person on the other end is not even
    // told a pass exists. Two answers, because this one costs somebody their
    // flight if it is wrong.
    const shared = withoutAttachments(trip);
    assert.equal(JSON.stringify(shared).includes("attachments"), false);
    assert.equal(JSON.stringify(shared).includes("KRK-TLV"), false);
  });

  it("keeps everything else exactly as it was", () => {
    const shared = withoutAttachments(trip);
    assert.equal(shared.title, "Poland");
    assert.equal(shared.flights[0].from, "JFK");
    assert.equal(shared.activities.length, 2);
    assert.equal(shared.activities[1].name, "Uman");
  });

  it("does not mind a trip with nothing attached, or no lists at all", () => {
    assert.deepEqual(withoutAttachments({ title: "Bare", activities: undefined }), { title: "Bare", activities: undefined });
    assert.deepEqual(withoutAttachments({ activities: [{ id: "a" }] }).activities, [{ id: "a" }]);
  });

  it("leaves the original alone", () => {
    withoutAttachments(trip);
    assert.equal(trip.flights[0].attachments.length, 1, "stripping is a copy, not an edit");
  });
});

describe("counting them", () => {
  it("adds up across flights, hotels and stops", () => {
    assert.equal(
      countAttachments({
        flights: [{ attachments: [file(), file({ id: "b" })] }],
        lodging: [{ attachments: [file({ id: "c" })] }],
        activities: [{ attachments: [] }, {}],
      }),
      3,
    );
    assert.equal(countAttachments({}), 0);
  });
});
