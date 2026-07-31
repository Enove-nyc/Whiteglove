import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactVisibility, publishableContact, responseNote, verifiedLabel } from "@/lib/provider-contact";

// The directory lists other people's businesses. Some are agencies whose
// number is printed on their own website; some are one person with a mobile
// who mentioned it once. The first two tests are the whole rule.

describe("whether a provider's number may be published", () => {
  it("publishes it when they said it could be", () => {
    const answer = contactVisibility({ contactConsent: true });
    assert.equal(answer.show, true);
    assert.equal(answer.reason, "consent");
  });

  it("publishes it when they already publish it themselves", () => {
    // Repeating a number off a business's own website is a link with the
    // digits copied out, not disclosure.
    const answer = contactVisibility({ source: "https://example.com/contact" });
    assert.equal(answer.show, true);
    assert.equal(answer.reason, "public-source");
  });

  it("withholds it when there is neither", () => {
    const answer = contactVisibility({});
    assert.equal(answer.show, false);
    assert.equal(answer.reason, "none");
    assert.ok(answer.explanation.length > 0, "the admin needs to be told why");
  });

  it("does not treat a blank source as a source", () => {
    assert.equal(contactVisibility({ source: "   " }).show, false);
    assert.equal(contactVisibility({ source: null }).show, false);
  });

  it("takes consent over a missing source", () => {
    assert.equal(contactVisibility({ contactConsent: true, source: null }).show, true);
  });
});

describe("what actually reaches the page", () => {
  it("strips both numbers when there are no grounds", () => {
    const out = publishableContact({ phone: "+48 601 815 687", whatsapp: "+48 601 815 687" }, {});
    assert.equal(out.phone, null);
    assert.equal(out.whatsapp, null);
    assert.equal(out.contactWithheld, true);
  });

  it("keeps them when there are", () => {
    const out = publishableContact({ phone: "+1 718 000 0000" }, { source: "https://example.com" });
    assert.equal(out.phone, "+1 718 000 0000");
    assert.equal(out.contactWithheld, false);
  });

  it("does not claim to have withheld a number nobody gave", () => {
    const out = publishableContact({ phone: null, whatsapp: null }, {});
    assert.equal(out.contactWithheld, false, "a provider with no number has not had one held back");
  });

  it("counts a whatsapp-only listing as withheld", () => {
    assert.equal(publishableContact({ whatsapp: "+972 50 000 0000" }, {}).contactWithheld, true);
  });

  it("treats an empty string as no number at all", () => {
    assert.equal(publishableContact({ phone: "   " }, {}).contactWithheld, false);
  });
});

describe("saying we checked a listing", () => {
  it("says nothing at all when nobody has", () => {
    // Not "unverified". This is somebody else's business, and a judgement
    // stamped on a public page is a different act from marking our own
    // content unfinished.
    assert.equal(verifiedLabel(null), null);
    assert.equal(verifiedLabel(undefined), null);
    assert.equal(verifiedLabel(""), null);
  });

  it("gives the date when somebody has", () => {
    assert.equal(verifiedLabel("2026-03-03"), "Details checked 3 March 2026");
  });

  it("says nothing rather than something wrong about an unreadable date", () => {
    assert.equal(verifiedLabel("not a date"), null);
  });
});

describe("how quickly they answer", () => {
  it("is their words or nothing", () => {
    assert.equal(responseNote("  same day "), "same day");
    assert.equal(responseNote(""), null);
    assert.equal(responseNote(null), null);
  });
});
