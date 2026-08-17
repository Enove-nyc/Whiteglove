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
    // It says plainly that there is nothing to join. This used to be matched
    // as /not live/, which the old wording satisfied by reporting the state of
    // the owner's work — "is being prepared. It is not live, and no rewards
    // are available yet." Three announcements of unfinished work to somebody
    // who only needed the first four words.
    assert.match(status.body, /no referral programme/i);
    assert.doesNotMatch(status.body, /\$\d|%|points/i);
    assert.doesNotMatch(
      status.body,
      /being prepared|not open yet|coming soon|\byet\b/i,
      "a closed programme should not report the owner's progress towards opening it",
    );
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
