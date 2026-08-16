import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_FEATURED_NOTE, FEATURED_REASONS, featuredDisclosure, featuredReasonLabel, SITE_DOMAIN, SITE_NAME } from "@/lib/features";

// Three answers the owner gave, turned into code and held here so they are not
// quietly reverted by a later edit.

describe("which site this is", () => {
  it("names White Glove and nothing else", () => {
    // The terms and the privacy policy once named a different business's
    // domain — the wrong answer to "who is holding my data". That domain has
    // since been given up; the assertion stays so it cannot come back.
    // The visible brand is "White Glove Kosher Travel"; the domain, the email
    // addresses and the storage keys keep the original name and must not
    // follow the rename.
    assert.equal(SITE_DOMAIN, "whitegloveitineraries.com");
    assert.equal(SITE_NAME, "White Glove Kosher Travel");
    assert.ok(!SITE_DOMAIN.includes("enove"));
  });
});

describe("what Featured means", () => {
  it("has exactly the two reasons the owner chose", () => {
    assert.deepEqual(FEATURED_REASONS.map((r) => r.value), ["service", "sponsored"]);
  });

  it("names a reason that was never recorded rather than inventing one", () => {
    assert.equal(featuredReasonLabel(""), "Not recorded");
    assert.equal(featuredReasonLabel(undefined), "Not recorded");
    assert.equal(featuredReasonLabel("sponsored"), "Sponsored placement");
  });

  it("tells visitors that some featured listings are paid for", () => {
    // The badge is deliberately the same for both reasons, which is what was
    // asked for. What it must not do is imply that none of them are paid —
    // that is the part advertising rules are written to catch.
    assert.match(DEFAULT_FEATURED_NOTE, /sponsored/i);
    assert.match(featuredDisclosure(), /sponsored/i);
  });

  it("does not name which listing is which", () => {
    // Naming one would be the opposite of the decision.
    assert.ok(!/this listing|that listing/i.test(DEFAULT_FEATURED_NOTE));
  });
});
