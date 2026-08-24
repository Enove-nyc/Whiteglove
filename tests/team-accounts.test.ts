import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { describeSeats, inviteProblem, readTeam, seatsUsed, type TeamMember } from "@/data/team";
import { BUILT_IN_LIMITS } from "@/lib/account-limits";

function member(email: string, over: Partial<TeamMember> = {}): TeamMember {
  return { email, status: "active", invitedAt: "2026-01-01T00:00:00Z", ...over };
}

describe("reading a stored team roster", () => {
  it("drops anything with no email or no invitedAt", () => {
    const out = readTeam([{ email: "a@x.com" }, { invitedAt: "t" }, { email: "b@x.com", invitedAt: "t" }]);
    assert.equal(out.length, 1);
    assert.equal(out[0].email, "b@x.com");
  });

  it("an unrecognized status reads as invited, not silently active", () => {
    const [m] = readTeam([{ email: "a@x.com", invitedAt: "t", status: "something-else" }]);
    assert.equal(m.status, "invited");
  });

  it("is empty for anything that isn't an array", () => {
    assert.deepEqual(readTeam(undefined), []);
    assert.deepEqual(readTeam("not an array"), []);
  });
});

describe("seats used — an invited seat counts the same as an active one", () => {
  it("counts both invited and active members", () => {
    const team = [member("a@x.com", { status: "invited" }), member("b@x.com", { status: "active" })];
    assert.equal(seatsUsed(team), 2);
  });

  it("an empty team uses zero seats", () => {
    assert.equal(seatsUsed([]), 0);
  });
});

describe("why an invite cannot be sent", () => {
  const owner = "owner@example.com";

  it("refuses a blank address", () => {
    assert.match(inviteProblem({ email: "  ", ownerEmail: owner, existingTeam: [], seats: 3 }) ?? "", /Enter an email/);
  });

  it("refuses the owner's own address", () => {
    assert.match(inviteProblem({ email: owner, ownerEmail: owner, existingTeam: [], seats: 3 }) ?? "", /own account/);
  });

  it("refuses somebody already on the team", () => {
    const team = [member("a@x.com")];
    assert.match(inviteProblem({ email: "a@x.com", ownerEmail: owner, existingTeam: team, seats: 3 }) ?? "", /Already on your team/);
  });

  it("matching is case- and whitespace-insensitive, the same as everywhere else identities are compared", () => {
    const team = [member("a@x.com")];
    assert.match(inviteProblem({ email: "  A@X.COM  ", ownerEmail: owner, existingTeam: team, seats: 3 }) ?? "", /Already on your team/);
  });

  it("refuses a new invite once every seat is spoken for", () => {
    const team = [member("a@x.com"), member("b@x.com"), member("c@x.com")];
    assert.match(inviteProblem({ email: "d@x.com", ownerEmail: owner, existingTeam: team, seats: 3 }) ?? "", /3 staff logins/);
  });

  it("an invited (not yet accepted) seat still blocks a new invite — it was already committed", () => {
    const team = [member("a@x.com", { status: "invited" })];
    assert.match(inviteProblem({ email: "b@x.com", ownerEmail: owner, existingTeam: team, seats: 1 }) ?? "", /1 staff login/);
  });

  it("unlimited seats (null) never refuses on seat count", () => {
    const team = Array.from({ length: 50 }, (_, i) => member(`m${i}@x.com`));
    assert.equal(inviteProblem({ email: "new@x.com", ownerEmail: owner, existingTeam: team, seats: null }), null);
  });

  it("is null — no problem — when there's genuinely room", () => {
    assert.equal(inviteProblem({ email: "new@x.com", ownerEmail: owner, existingTeam: [], seats: 3 }), null);
  });
});

describe("describing seat usage", () => {
  it("says how many are left when there's room", () => {
    const team = [member("a@x.com")];
    assert.match(describeSeats(team, 3), /1 of 3.*2 more can be added/);
  });

  it("says every seat is used, without a negative \"more\"", () => {
    const team = [member("a@x.com"), member("b@x.com")];
    assert.match(describeSeats(team, 2), /2 of 2 staff logins used\./);
    assert.doesNotMatch(describeSeats(team, 2), /more can be added/);
  });

  it("says a plain count when seats are unlimited", () => {
    const team = [member("a@x.com")];
    assert.equal(describeSeats(team, null), "1 staff login.");
  });
});

describe("staff seats are wired into the plan limits every plan already has", () => {
  it("the plans that cannot serve clients have zero seats — nobody to add a teammate for", () => {
    assert.equal(BUILT_IN_LIMITS.free.staffSeats, 0);
    assert.equal(BUILT_IN_LIMITS.one_trip.staffSeats, 0);
  });

  it("the client-serving plans start with seats to invite into", () => {
    assert.ok((BUILT_IN_LIMITS.starter.staffSeats ?? 0) > 0);
    assert.ok((BUILT_IN_LIMITS.pro.staffSeats ?? 0) > 0);
  });
});

describe("team management is fenced to the account owner, never a staff login", () => {
  const ROUTE = readFileSync("app/api/account/team/route.ts", "utf8");

  it("checks the signed-in identity's OWN record for teamOwnerEmail, never resolveBusinessOwner — a member must fail this check, not be silently redirected to managing the business they work for", () => {
    const fn = ROUTE.slice(ROUTE.indexOf("async function ownerEmail"), ROUTE.indexOf("export async function GET"));
    assert.match(fn, /getAccountRecord\(account\.email\)/);
    assert.match(fn, /if \(record\?\.teamOwnerEmail\) return \{ error: "Only the account owner manages the team\."/);
  });

  it("every write checks same-origin before touching the store", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"), ROUTE.indexOf("export async function DELETE"));
    const del = ROUTE.slice(ROUTE.indexOf("export async function DELETE"));
    assert.match(post, /sameOrigin/);
    assert.match(del, /sameOrigin/);
  });

  it("is gated on mayServeCompanionClients — a team is a Business feature", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });
});

describe("accepting an invite links the signed-in identity, never the request body's claim", () => {
  const ROUTE = readFileSync("app/api/team/accept/route.ts", "utf8");
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("passes the session's own account.email to acceptTeamInvite, not anything from the body", () => {
    assert.match(ROUTE, /acceptTeamInvite\(token, account\.email\)/);
  });

  it("checks same-origin before touching the store", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("getCurrentAccountData"));
  });

  it("store-side: refuses the owner joining their own business as staff", () => {
    const fn = STORE.slice(STORE.indexOf("export async function acceptTeamInvite"), STORE.indexOf("export async function removeTeamMember"));
    assert.match(fn, /if \(accepter === owner\) return \{ ok: false as const, error: "You cannot join your own business as staff\."/);
  });

  it("store-side: refuses an account that already owns its own team from also becoming staff", () => {
    const fn = STORE.slice(STORE.indexOf("export async function acceptTeamInvite"), STORE.indexOf("export async function removeTeamMember"));
    assert.match(fn, /if \(accepterRecord\.team && accepterRecord\.team\.length > 0\)/);
  });

  it("store-side: deletes the invite token once accepted, so it cannot be reused", () => {
    const fn = STORE.slice(STORE.indexOf("export async function acceptTeamInvite"), STORE.indexOf("export async function removeTeamMember"));
    assert.match(fn, /deleteKey\(teamInviteKey\(token\)\)/);
  });
});

describe("removing a member cuts the link both ways", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("clears teamOwnerEmail on the member's own record, not just the owner's roster", () => {
    const fn = STORE.slice(STORE.indexOf("export async function removeTeamMember"), STORE.indexOf("export async function resolveBusinessOwner"));
    assert.match(fn, /teamOwnerEmail: undefined/);
  });

  it("never touches the member's trips or any other data — only the link", () => {
    const fn = STORE.slice(STORE.indexOf("export async function removeTeamMember"), STORE.indexOf("export async function resolveBusinessOwner"));
    assert.doesNotMatch(fn, /deleteTrip|deleteAccount|writeTrips/);
  });

  it("revokes a still-pending invite's own join token — a withdrawn invite is not just off the roster, its link stops working too", () => {
    const fn = STORE.slice(STORE.indexOf("export async function removeTeamMember"), STORE.indexOf("export async function resolveBusinessOwner"));
    assert.match(fn, /deleteKey\(teamInviteKey\(entry\.inviteToken\)\)/);
  });

  it("fails closed when the token cannot be revoked — the roster row holding that token is never dropped after a failed delete", () => {
    const fn = STORE.slice(STORE.indexOf("export async function removeTeamMember"), STORE.indexOf("export async function resolveBusinessOwner"));
    const revokeAt = fn.indexOf("const revoked = await deleteKey");
    const bailAt = fn.indexOf("if (!revoked)");
    const rosterWriteAt = fn.indexOf("const ownerSaved = await writeJson");
    assert.ok(revokeAt > 0 && bailAt > revokeAt, "the delete's result is checked, not ignored");
    assert.ok(bailAt < rosterWriteAt, "it returns before the roster row (the token's only handle) is removed");
  });
});

describe("a pending invite's own join token travels with its roster entry", () => {
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("inviteTeamMember stamps the token onto the new roster entry", () => {
    const fn = STORE.slice(STORE.indexOf("export async function inviteTeamMember"), STORE.indexOf("export async function getTeamInvite"));
    assert.match(fn, /inviteToken: token/);
  });

  it("readTeam carries inviteToken through, the same as every other field", () => {
    const stored = [{ email: "staff@example.com", status: "invited", invitedAt: "2026-01-01T00:00:00Z", inviteToken: "abc123" }];
    assert.equal(readTeam(stored)[0].inviteToken, "abc123");
  });
});

describe("resolveBusinessOwner is the one seam business-data routes read", () => {
  const WIRED = [
    "app/api/account/pipeline/route.ts",
    "app/api/account/trips/route.ts",
    "app/api/account/library/route.ts",
    "app/api/account/payments/route.ts",
    "app/api/account/proposal/route.ts",
    "app/api/account/itinerary/route.ts",
    "app/api/account/alerts/route.ts",
    "app/api/account/print/route.ts",
    "app/api/account/client-form/route.ts",
    "app/api/account/traveler-share/route.ts",
    "app/api/account/attachments/route.ts",
    "app/api/account/branding/route.ts",
    "app/api/account/itinerary/send/route.ts",
    "app/app/page.tsx",
  ];

  for (const path of WIRED) {
    it(`${path} resolves the signed-in identity through resolveBusinessOwner`, () => {
      const src = readFileSync(path, "utf8");
      assert.match(src, /resolveBusinessOwner/);
    });
  }

  // Deliberately NOT resolved — each of these is either the signed-in
  // login's own identity-level thing (settings, personal favorites, a
  // per-login rate limit, collaboration invites addressed to one specific
  // person) rather than the shared business's trips/pipeline/library.
  const DELIBERATELY_PERSONAL = [
    "app/api/account/update/route.ts",
    "app/api/account/places/route.ts",
    "app/api/account/smart-import/route.ts",
    "app/api/account/shared-with-me/route.ts",
  ];

  for (const path of DELIBERATELY_PERSONAL) {
    it(`${path} stays on the signed-in identity itself, not resolved to a business owner`, () => {
      const src = readFileSync(path, "utf8");
      assert.doesNotMatch(src, /resolveBusinessOwner/);
    });
  }
});
