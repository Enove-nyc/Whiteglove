import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { describeIdentity, identityKey, isPhoneIdentity, normalizeIdentity, normalizePhone } from "../lib/identity";

// An account is stored under whatever it is named by, so two spellings of the
// same number must land on the same string — otherwise somebody signs up
// twice without meaning to and loses the trip they saved the first time.

describe("a phone number, however it was typed", () => {
  const sameNumber = [
    "5551234567",
    "555 123 4567",
    "(555) 123-4567",
    "555-123-4567",
    "+1 555 123 4567",
    "+15551234567",
    "1 (555) 123.4567",
    "001 555 123 4567",
  ];

  for (const typed of sameNumber) {
    test(`"${typed}" is the same account`, () => {
      assert.equal(normalizePhone(typed), "+15551234567");
      assert.equal(identityKey(typed), "+15551234567");
    });
  }

  test("an international number keeps its own country code", () => {
    assert.equal(normalizePhone("+972 2 123 4567"), "+97221234567");
    assert.equal(normalizePhone("+44 20 7946 0958"), "+442079460958");
  });

  test("something too short to dial is refused rather than guessed at", () => {
    // Sending a code to a typo means somebody waits for a text that is never
    // coming, with nothing to tell them why.
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone("555"), null);
    assert.equal(normalizeIdentity("555"), null);
  });

  test("longer than E.164 allows is refused too", () => {
    assert.equal(normalizePhone("+1234567890123456"), null);
  });
});

describe("an email address", () => {
  test("is stored lowercase, so case is not a second account", () => {
    assert.equal(identityKey("Yaakov.Cohen@Example.COM"), "yaakov.cohen@example.com");
    assert.equal(normalizeIdentity(" someone@example.org ")?.kind, "email");
  });

  test("something that is not one is refused", () => {
    assert.equal(normalizeIdentity("not an email"), null);
    assert.equal(normalizeIdentity("missing@domain"), null);
    assert.equal(normalizeIdentity("two@at@signs.com"), null);
    assert.equal(normalizeIdentity(""), null);
  });
});

describe("telling the two apart", () => {
  test("reads an email as an email and a number as a number", () => {
    assert.equal(normalizeIdentity("someone@example.com")?.kind, "email");
    assert.equal(normalizeIdentity("+1 555 123 4567")?.kind, "phone");
  });

  test("a stored identity says which it is without being asked", () => {
    assert.equal(isPhoneIdentity("+15551234567"), true);
    assert.equal(isPhoneIdentity("someone@example.com"), false);
  });

  test("spells a number back the way a person reads it", () => {
    assert.equal(describeIdentity("+15551234567"), "+1 555 123 4567");
    assert.equal(describeIdentity("someone@example.com"), "someone@example.com");
  });
});

describe("accounts that already exist", () => {
  test("an email account made before numbers were allowed keys the same way", () => {
    // identityKey falls back to trimmed lower case rather than refusing, so an
    // older record still finds itself.
    assert.equal(identityKey("Old.Account@example.com"), "old.account@example.com");
  });

  test("an unreadable identifier still keys to something rather than throwing", () => {
    assert.equal(identityKey("  Whatever This Is  "), "whatever this is");
  });
});
