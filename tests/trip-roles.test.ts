import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type Collaborator,
  DEFAULT_ROLE,
  ROLE_LABELS,
  TRIP_ROLES,
  describeRole,
  isTripRole,
  may,
  readCollaborators,
  roleOf,
  shareProblem,
  whatTheyCanDo,
} from "@/lib/trip-roles";

/**
 * What somebody you shared a trip with is allowed to do.
 *
 * The rule underneath every test here: adding roles must not be the reason
 * anybody can suddenly do more than they could yesterday. Everyone already on
 * a trip is a viewer, an unreadable role is a viewer, and somebody not on the
 * list can do nothing at all — including read.
 */

const OWNER = "owner@example.com";
const list = (...c: Collaborator[]) => c;

describe("reading who is on a trip", () => {
  it("takes the new shape", () => {
    assert.deepEqual(readCollaborators([{ person: "a@x.com", role: "editor" }]), [{ person: "a@x.com", role: "editor", addedAt: undefined }]);
  });

  it("treats everybody already on a trip as a viewer", () => {
    // They were a flat list of addresses and could only look. Handing them the
    // pen because the code grew a roles field would be the worst kind of
    // upgrade: silent, and in the direction of more power.
    assert.deepEqual(readCollaborators(["a@x.com", "b@x.com"]).map((c) => c.role), ["viewer", "viewer"]);
    assert.equal(DEFAULT_ROLE, "viewer");
  });

  it("treats a role it does not recognise as a viewer", () => {
    // Whatever went wrong, the safe end of it is the one where nobody gained.
    assert.equal(readCollaborators([{ person: "a@x.com", role: "owner" }])[0].role, "viewer");
    assert.equal(readCollaborators([{ person: "a@x.com" }])[0].role, "viewer");
    assert.equal(isTripRole("owner"), false);
    assert.equal(isTripRole("editor"), true);
  });

  it("drops anything it cannot identify rather than guessing", () => {
    assert.deepEqual(readCollaborators([null, 42, {}, { person: "  " }, ""]), []);
    assert.deepEqual(readCollaborators("not a list"), []);
    assert.deepEqual(readCollaborators(undefined), []);
  });
});

describe("what each role can do", () => {
  it("a viewer can look and nothing else", () => {
    const on = { owner: OWNER, asker: "v@x.com", collaborators: list({ person: "v@x.com", role: "viewer" }) };
    assert.equal(may("view", on), true);
    assert.equal(may("comment", on), false);
    assert.equal(may("edit", on), false);
  });

  it("a commenter can say something and change nothing", () => {
    const on = { owner: OWNER, asker: "c@x.com", collaborators: list({ person: "c@x.com", role: "commenter" }) };
    assert.equal(may("view", on), true);
    assert.equal(may("comment", on), true);
    assert.equal(may("edit", on), false);
  });

  it("an editor can do all three", () => {
    const on = { owner: OWNER, asker: "e@x.com", collaborators: list({ person: "e@x.com", role: "editor" }) };
    assert.deepEqual(whatTheyCanDo("editor"), ["view", "comment", "edit"]);
    assert.equal(may("edit", on), true);
  });

  it("gives the owner everything, whatever the list says", () => {
    // He is the account the trip is in. No list decides that, and a trip whose
    // owner can be edited out of it is a trip that can be taken.
    const on = { owner: OWNER, asker: OWNER, collaborators: list({ person: OWNER, role: "viewer" }) };
    for (const action of ["view", "comment", "edit"] as const) assert.equal(may(action, on), true, action);
  });

  it("gives somebody not on the list nothing — including reading it", () => {
    // A trip is private. "Not shared with you" is not a smaller permission
    // than viewing; it is no access at all.
    const on = { owner: OWNER, asker: "stranger@x.com", collaborators: list({ person: "e@x.com", role: "editor" }) };
    for (const action of ["view", "comment", "edit"] as const) assert.equal(may(action, on), false, action);
  });

  it("gives a signed-out visitor nothing", () => {
    const on = { owner: OWNER, asker: null, collaborators: list({ person: "e@x.com", role: "editor" }) };
    assert.equal(may("view", on), false);
  });

  it("does not care about capitals or stray spaces", () => {
    // Somebody typed in as "A@X.com" and signing in as "a@x.com" is the same
    // person, and being locked out of a trip over a capital letter is the kind
    // of thing nobody ever works out.
    const on = { owner: OWNER, asker: " A@X.com ", collaborators: list({ person: "a@x.com", role: "editor" }) };
    assert.equal(may("edit", on), true);
  });
});

describe("which role somebody holds", () => {
  it("says it, or says they are not on the trip", () => {
    const people = list({ person: "c@x.com", role: "commenter" });
    assert.equal(roleOf("c@x.com", people), "commenter");
    assert.equal(roleOf("nobody@x.com", people), null);
    assert.equal(roleOf(null, people), null);
  });
});

describe("sharing it with somebody", () => {
  it("takes an address and a role", () => {
    assert.equal(shareProblem({ owner: OWNER, person: "friend@x.com", role: "editor" }), null);
  });

  it("will not take a trip shared with its own owner", () => {
    assert.equal(shareProblem({ owner: OWNER, person: " OWNER@example.com ", role: "viewer" }), "That is your own account.");
  });

  it("makes you say what they can do", () => {
    // Not defaulted. Whoever is sharing should decide, once, in front of them —
    // rather than find out later that everybody got whatever the code chose.
    assert.equal(shareProblem({ owner: OWNER, person: "f@x.com", role: undefined }), "Choose what they can do.");
    assert.equal(shareProblem({ owner: OWNER, person: "f@x.com", role: "boss" }), "Choose what they can do.");
  });

  it("needs somebody to share it with", () => {
    assert.match(String(shareProblem({ owner: OWNER, person: "  ", role: "viewer" })), /email address or a phone/);
  });
});

describe("what the person is told", () => {
  it("says what they can do before they try", () => {
    // Finding out that Save does nothing by pressing it is how somebody loses
    // twenty minutes of typing.
    assert.match(describeRole("editor", "Yossi"), /can change it/i);
    assert.match(describeRole("commenter", "Yossi"), /leave notes|not change/i);
    assert.match(describeRole("viewer", "Yossi"), /look at/i);
    assert.match(describeRole(null, "Yossi"), /not shared this with you/i);
  });

  it("has a label and a description for every role", () => {
    for (const role of TRIP_ROLES) {
      assert.ok(ROLE_LABELS[role]?.length, role);
      assert.ok(whatTheyCanDo(role).includes("view"), `${role} should at least be able to look`);
    }
  });
});
