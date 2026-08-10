import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alertCopy,
  defaultTopicsFor,
  readTopics,
  signupProblem,
} from "@/lib/email-alerts";

describe("alert signup validation", () => {
  it("requires consent, email and at least one topic", () => {
    assert.match(signupProblem({ email: "", topics: ["new_destinations"], consented: true }) ?? "", /email/i);
    assert.match(signupProblem({ email: "a@b.co", topics: [], consented: true }) ?? "", /kind of update/i);
    assert.match(signupProblem({ email: "a@b.co", topics: ["new_destinations"], consented: false }) ?? "", /tick/i);
    assert.equal(signupProblem({ email: "a@b.co", topics: ["new_destinations"], consented: true }), null);
  });

  it("requires a place when destination updates are chosen", () => {
    assert.match(
      signupProblem({ email: "a@b.co", topics: ["destination_updates"], consented: true }) ?? "",
      /destination/i,
    );
    assert.equal(
      signupProblem({
        email: "a@b.co",
        topics: ["destination_updates"],
        destinationSlug: "rome",
        consented: true,
      }),
      null,
    );
  });

  it("reads known topics only", () => {
    assert.deepEqual(readTopics(["new_destinations", "nope", "pesach_sukkos", "new_destinations"]), [
      "new_destinations",
      "pesach_sukkos",
    ]);
  });
});

describe("alert copy", () => {
  it("is contextual, not a generic newsletter pitch", () => {
    const destination = alertCopy({ kind: "destination", destinationName: "Rome" });
    assert.match(destination.heading, /Rome/);
    assert.doesNotMatch(destination.intro, /join our newsletter/i);
    assert.match(alertCopy({ kind: "search_miss" }).heading, /added/i);
  });

  it("defaults useful topics per context", () => {
    assert.ok(defaultTopicsFor("seasonal").includes("pesach_sukkos"));
    assert.ok(defaultTopicsFor("search_miss").includes("searched_destination"));
  });
});
