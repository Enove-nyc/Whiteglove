import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDraft,
  changedFields,
  cleanDraft,
  consentFromSubmission,
  DIRECTORY_CATEGORIES,
  DIRECTORY_FIELDS,
  draftFromProvider,
  draftProblems,
  type DirectoryDraft,
} from "@/lib/directory-fields";

const LISTING: DirectoryDraft = {
  name: "Reb Yossi's Uman Tours",
  category: "TOUR_OPERATOR",
  phone: "+380 50 000 0000",
  basedIn: "Uman, Ukraine",
};

describe("what a listing is made of", () => {
  it("is one definition, used by both forms", () => {
    // The public form used to collect five things and mash them into prose.
    // If these ever drift apart, accepting becomes retyping again.
    assert.ok(DIRECTORY_FIELDS.length >= 10);
    const keys = DIRECTORY_FIELDS.map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, "no field defined twice");
    for (const field of DIRECTORY_FIELDS) assert.ok(field.label.trim().length > 0);
  });

  it("marks the ways of reaching a person, which the consent rule is about", () => {
    const personal = DIRECTORY_FIELDS.filter((f) => f.personal).map((f) => f.key);
    assert.deepEqual(personal.sort(), ["phone", "whatsapp"]);
  });
});

describe("cleaning what was submitted", () => {
  it("keeps only fields we know", () => {
    const draft = cleanDraft({ name: "A tour", category: "TOUR_OPERATOR", isAdmin: true, published: true });
    assert.deepEqual(Object.keys(draft).sort(), ["category", "name"]);
  });

  it("drops blanks rather than storing empty strings", () => {
    assert.deepEqual(cleanDraft({ name: "A tour", tagline: "   " }), { name: "A tour" });
  });

  it("survives rubbish", () => {
    assert.deepEqual(cleanDraft(null), {});
    assert.deepEqual(cleanDraft("nope"), {});
    assert.deepEqual(cleanDraft({ name: 42 }), {});
  });
});

describe("what is wrong with a submission", () => {
  it("wants a name", () => {
    assert.ok(draftProblems({ phone: "+1 555" }).some((p) => /name/i.test(p)));
  });

  it("wants at least one way to reach them", () => {
    // A listing nobody can contact is not a listing.
    assert.ok(draftProblems({ name: "A tour" }).some((p) => /reach/i.test(p)));
    assert.equal(draftProblems({ name: "A tour", email: "a@b.co" }).length, 0);
  });

  it("accepts only the categories that exist", () => {
    assert.ok(draftProblems({ ...LISTING, category: "SOMETHING_ELSE" }).length > 0);
    for (const c of DIRECTORY_CATEGORIES) {
      assert.equal(draftProblems({ ...LISTING, category: c.value }).length, 0, `${c.value} should be accepted`);
    }
  });

  it("catches an address that is not one", () => {
    assert.ok(draftProblems({ ...LISTING, email: "not-an-email" }).some((p) => /email/i.test(p)));
  });
});

describe("what a submission would change", () => {
  it("lists only the fields that move", () => {
    // Thirteen rows with one difference in them buries the difference.
    const changes = changedFields(LISTING, { ...LISTING, phone: "+380 50 111 1111" });
    assert.deepEqual(changes.map((c) => c.key), ["phone"]);
    assert.equal(changes[0].from, "+380 50 000 0000");
    assert.equal(changes[0].to, "+380 50 111 1111");
  });

  it("treats a blank box as 'leave it alone', not 'delete it'", () => {
    // They were filling in a form, not editing a record. Reading an empty box
    // as a deletion would quietly strip listings.
    const changes = changedFields(LISTING, { name: LISTING.name, phone: "" });
    assert.deepEqual(changes, []);
  });

  it("calls everything a change when there is nothing to compare with", () => {
    const changes = changedFields({}, LISTING);
    assert.equal(changes.length, Object.keys(LISTING).length);
    assert.ok(changes.every((c) => c.from === ""));
  });
});

describe("merging a submission onto a listing", () => {
  it("writes what was filled in and leaves the rest", () => {
    const next = applyDraft({ id: "x", name: "Old name", phone: "+1 old", email: "keep@me.co" } as never, {
      name: "New name",
    });
    assert.equal(next.name, "New name");
    assert.equal(next.phone, "+1 old", "a field they left blank is not a deletion");
    assert.equal(next.email, "keep@me.co");
    assert.equal((next as { id?: string }).id, "x", "the record's own identity survives");
  });

  it("round-trips a stored listing through a draft", () => {
    const stored = { id: "x", name: "A tour", category: "TOUR_OPERATOR" as const, phone: "+1 555", createdAt: "" };
    assert.deepEqual(draftFromProvider(stored), { name: "A tour", category: "TOUR_OPERATOR", phone: "+1 555" });
  });
});

describe("consent given on the form", () => {
  const who = { name: "Yossi", email: "yossi@example.com" };

  it("needs both answers", () => {
    // A number sent in by a passer-by is not permission, and this must not
    // become a way around that.
    assert.equal(consentFromSubmission({}, who, "2026-07-31").contactConsent, false);
    assert.equal(consentFromSubmission({ ownsBusiness: true }, who, "2026-07-31").contactConsent, false);
    assert.equal(consentFromSubmission({ publishContact: true }, who, "2026-07-31").contactConsent, false);
  });

  it("records who gave it and when", () => {
    const consent = consentFromSubmission({ ownsBusiness: true, publishContact: true }, who, "2026-07-31");
    assert.equal(consent.contactConsent, true);
    assert.match(consent.contactConsentNote ?? "", /Yossi/);
    assert.match(consent.contactConsentNote ?? "", /yossi@example\.com/);
    assert.match(consent.contactConsentNote ?? "", /2026-07-31/);
  });

  it("leaves no note when there is no consent", () => {
    assert.equal(consentFromSubmission({}, who, "2026-07-31").contactConsentNote, undefined);
  });
});
