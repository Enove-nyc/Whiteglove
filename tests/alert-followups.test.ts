import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { followupProblem, recipientsFor } from "@/lib/alert-followups";
import type { AlertSignup } from "@/lib/email-alerts";

function signup(overrides: Partial<AlertSignup> = {}): AlertSignup {
  return {
    email: "a@example.com",
    topics: ["pesach_sukkos"],
    sourcePage: "/collections/summer",
    consentedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    unsubToken: "tok",
    ...overrides,
  };
}

describe("a follow-up is not invented", () => {
  it("refuses an empty subject or body", () => {
    assert.match(followupProblem({ topic: "pesach_sukkos", subject: "", body: "Arosa is open." }) ?? "", /subject/);
    assert.match(followupProblem({ topic: "pesach_sukkos", subject: "Arosa", body: "  " }) ?? "", /empty/);
  });

  it("refuses a topic nobody can have signed up for", () => {
    assert.match(followupProblem({ topic: "blast", subject: "Hi", body: "News." }) ?? "", /topic/);
  });

  it("refuses an off-site link", () => {
    assert.match(
      followupProblem({ topic: "seasonal", subject: "Hi", body: "News.", href: "https://example.com" }) ?? "",
      /this site/,
    );
    assert.match(followupProblem({ topic: "seasonal", subject: "Hi", body: "News.", href: "//evil" }) ?? "", /this site/);
    assert.equal(followupProblem({ topic: "seasonal", subject: "Hi", body: "News.", href: "/destinations/rome" }), null);
    assert.equal(
      followupProblem({ topic: "destination_updates", subject: "Rome", body: "A listing was added.", destinationSlug: "rome", href: "/destinations/rome" }),
      null,
    );
  });

  it("refuses a destination update with no destination, or one that is not published", () => {
    assert.match(followupProblem({ topic: "destination_updates", subject: "Hi", body: "News." }) ?? "", /destination/);
    assert.match(
      followupProblem({ topic: "destination_updates", subject: "Hi", body: "News.", destinationSlug: "nowhere" }) ?? "",
      /published/,
    );
  });
});

describe("a follow-up never includes somebody who did not ask", () => {
  it("keeps an unsubscribed address out", () => {
    const list = recipientsFor(
      [
        signup({ email: "gone@example.com", unsubscribedAt: "2026-02-01T00:00:00.000Z" }),
        signup({ email: "stay@example.com" }),
      ],
      { topic: "pesach_sukkos" },
    );
    assert.deepEqual(
      list.map((row) => row.email),
      ["stay@example.com"],
    );
  });

  it("keeps another topic out", () => {
    const list = recipientsFor([signup({ topics: ["new_listings"] })], { topic: "pesach_sukkos" });
    assert.equal(list.length, 0);
  });

  it("narrows destination updates to the place they named", () => {
    const list = recipientsFor(
      [
        signup({ email: "rome@example.com", topics: ["destination_updates"], destinationSlug: "rome" }),
        signup({ email: "paris@example.com", topics: ["destination_updates"], destinationSlug: "paris" }),
      ],
      { topic: "destination_updates", destinationSlug: "rome" },
    );
    assert.deepEqual(
      list.map((row) => row.email),
      ["rome@example.com"],
    );
  });
});
