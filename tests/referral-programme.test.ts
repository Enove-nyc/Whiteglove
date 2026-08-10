import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attributionProblem,
  normalizeReferralCode,
  publicReferralStatus,
  DEFAULT_REFERRAL_SETTINGS,
} from "@/lib/referral";

describe("referral programme", () => {
  it("stays closed by default with no invented rewards", () => {
    const status = publicReferralStatus(DEFAULT_REFERRAL_SETTINGS);
    assert.equal(status.open, false);
    assert.match(status.body, /not live/i);
    assert.doesNotMatch(status.body, /\$\d|%|points/i);
  });

  it("blocks self-referral", () => {
    assert.match(
      attributionProblem({ codeOwner: "a@b.co", referred: "A@b.co" }) ?? "",
      /own referral/i,
    );
    assert.equal(attributionProblem({ codeOwner: "a@b.co", referred: "friend@b.co" }), null);
  });

  it("normalises codes without accepting junk", () => {
    assert.equal(normalizeReferralCode(" ab-12cd "), "AB12CD");
    assert.equal(normalizeReferralCode("ab"), null);
  });
});
