import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  type AgencyRecord,
  describeSeats,
  extraSeats,
  inviteProblem,
  isMember,
  isOwner,
  MAX_SEATS,
  memberRole,
  removeMemberProblem,
  seatChangeProblem,
  seatsAvailable,
  seatsUsed,
} from "@/lib/agency";

/**
 * Several advisor logins sharing one Advisor Pro subscription.
 *
 * NOTHING HERE DECIDES WHAT ANYBODY CAN DO ON THE SITE — that is still
 * lib/account-limits.ts, unchanged, because a member simply IS a Pro account
 * once they join (see lib/agency.ts's header comment). What this file's
 * rules decide is narrower and just as important: who may be invited, who
 * may be removed, and how many seats a change is actually asking for.
 */

function agency(over: Partial<AgencyRecord> = {}): AgencyRecord {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id: "ag_1",
    owner: "owner@example.com",
    members: [{ account: "owner@example.com", role: "owner", joinedAt: now }],
    seatsPurchased: 1,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe("who is on it", () => {
  it("counts every member, including the owner", () => {
    const a = agency({
      members: [
        { account: "owner@example.com", role: "owner", joinedAt: "x" },
        { account: "advisor@example.com", role: "advisor", joinedAt: "x" },
      ],
    });
    assert.equal(seatsUsed(a), 2);
  });

  it("knows the owner from anybody else", () => {
    const a = agency();
    assert.equal(isOwner(a, "owner@example.com"), true);
    assert.equal(isOwner(a, "Owner@Example.com"), true);
    assert.equal(isOwner(a, "advisor@example.com"), false);
  });

  it("finds a member's role case- and whitespace-insensitively, the way an identity is always compared", () => {
    const a = agency({
      members: [
        { account: "owner@example.com", role: "owner", joinedAt: "x" },
        { account: "advisor@example.com", role: "advisor", joinedAt: "x" },
      ],
    });
    assert.equal(memberRole(a, "ADVISOR@example.com"), "advisor");
    assert.equal(memberRole(a, "nobody@example.com"), null);
    assert.equal(isMember(a, "advisor@example.com"), true);
    assert.equal(isMember(a, "nobody@example.com"), false);
  });
});

describe("seats", () => {
  it("counts what an open invite holds as taken, not free", () => {
    const a = agency({ seatsPurchased: 3 });
    assert.equal(seatsAvailable(a, 0), 2);
    assert.equal(seatsAvailable(a, 2), 0);
    // Never negative, even if seats were reduced out from under open invites.
    assert.equal(seatsAvailable(a, 5), 0);
  });

  it("bills only the seats beyond the founding one", () => {
    assert.equal(extraSeats(1), 0);
    assert.equal(extraSeats(2), 1);
    assert.equal(extraSeats(5), 4);
    // Never negative, however this got stored.
    assert.equal(extraSeats(0), 0);
  });

  it("REFUSES A SEAT COUNT BELOW WHAT IS ALREADY COMMITTED", () => {
    // Two members and one open invite is three seats spoken for — dropping to
    // two would either evict somebody or break a promise already made.
    const a = agency({
      members: [
        { account: "owner@example.com", role: "owner", joinedAt: "x" },
        { account: "advisor@example.com", role: "advisor", joinedAt: "x" },
      ],
      seatsPurchased: 3,
    });
    assert.equal(seatChangeProblem(a, 2, 1), "3 seats are filled or invited already. Remove somebody, or let an invite expire, before going lower.");
    assert.equal(seatChangeProblem(a, 3, 1), null);
  });

  it("lets somebody with no agency yet buy their first seats down to just themself", () => {
    // agency is null: nothing has been bought, so the floor is the one seat
    // they would be founding it with.
    assert.equal(seatChangeProblem(null, 1, 0), null);
    assert.equal(seatChangeProblem(null, 0, 0), "An agency needs at least one seat — your own.");
  });

  it("refuses nonsense numbers", () => {
    assert.match(seatChangeProblem(null, -1, 0) ?? "", /at least one seat/);
    assert.match(seatChangeProblem(null, 1.5, 0) ?? "", /at least one seat/);
    assert.match(seatChangeProblem(null, NaN, 0) ?? "", /at least one seat/);
  });

  it("has a ceiling, so a typo does not become a very large invoice", () => {
    assert.match(seatChangeProblem(null, MAX_SEATS + 1, 0) ?? "", new RegExp(String(MAX_SEATS)));
    assert.equal(seatChangeProblem(null, MAX_SEATS, 0), null);
  });

  it("describes where things stand, including what is only invited", () => {
    const a = agency({ seatsPurchased: 3 });
    assert.equal(describeSeats(a, 0), "1 of 3 seats filled.");
    assert.match(describeSeats(a, 2), /2 more invited/);
    assert.match(describeSeats(a, 2), /none free right now/);
  });
});

describe("inviting somebody", () => {
  const open = agency({ seatsPurchased: 2 });

  it("takes a plain invite when a seat is free", () => {
    assert.equal(inviteProblem({ agency: open, email: "new@example.com", pendingInvites: 0, alreadyElsewhere: false }), null);
  });

  it("EMAIL ONLY — there is no inbox for a phone number", () => {
    assert.match(
      inviteProblem({ agency: open, email: "+15551234567", pendingInvites: 0, alreadyElsewhere: false }) ?? "",
      /email/i,
    );
  });

  it("will not invite somebody already on it", () => {
    assert.match(
      inviteProblem({ agency: open, email: "owner@example.com", pendingInvites: 0, alreadyElsewhere: false }) ?? "",
      /already on this agency/,
    );
  });

  it("will not invite somebody already on a DIFFERENT agency", () => {
    // Checked by the caller against lib/agency-store.ts and handed in — this
    // file knows nothing about storage, only what to do with the answer.
    assert.match(
      inviteProblem({ agency: open, email: "elsewhere@example.com", pendingInvites: 0, alreadyElsewhere: true }) ?? "",
      /different agency/,
    );
  });

  it("refuses once every seat is filled or already invited", () => {
    const full = agency({ seatsPurchased: 1 }); // just the owner, no room
    assert.match(
      inviteProblem({ agency: full, email: "new@example.com", pendingInvites: 0, alreadyElsewhere: false }) ?? "",
      /Every seat is filled/,
    );
    // Two seats, one already promised to an open invite — the second is full too.
    assert.match(
      inviteProblem({ agency: open, email: "new@example.com", pendingInvites: 1, alreadyElsewhere: false }) ?? "",
      /Every seat is filled/,
    );
  });
});

describe("removing somebody", () => {
  const a = agency({
    members: [
      { account: "owner@example.com", role: "owner", joinedAt: "x" },
      { account: "advisor@example.com", role: "advisor", joinedAt: "x" },
    ],
  });

  it("removes an advisor cleanly", () => {
    assert.equal(removeMemberProblem(a, "advisor@example.com"), null);
  });

  it("NEVER REMOVES THE OWNER THIS WAY — their card is the one on file", () => {
    assert.match(removeMemberProblem(a, "owner@example.com") ?? "", /owner cannot be removed/);
  });

  it("says so when they are not on it at all", () => {
    assert.match(removeMemberProblem(a, "stranger@example.com") ?? "", /not on this agency/);
  });
});

describe("what happens when the Pro subscription that pays for it all lapses", () => {
  const WEBHOOK = readFileSync("app/api/billing/webhook/route.ts", "utf8");
  const AGENCY_ROUTE = readFileSync("app/api/account/agency/route.ts", "utf8");

  it("takes every other member off the agency, not just their plan", () => {
    // A demoted-but-still-listed member is a seat that looks filled but
    // promotes nobody back on its own — see the comment beside this in the
    // webhook itself for why that is worse than an honest empty roster.
    const branch = WEBHOOK.slice(WEBHOOK.indexOf('if (plan === "pro")'));
    assert.match(branch, /setAccountAgency\(member\.account, undefined\)/);
    assert.match(branch, /members: agency\.members\.filter/);
  });

  it("restores each member to their OWN entitlement, never a blanket free", () => {
    const branch = WEBHOOK.slice(WEBHOOK.indexOf('if (plan === "pro")'));
    assert.match(branch, /ownEntitledPlan\(member\.account\)/);
  });

  it("clears every open invite, so a stale link cannot mint a fresh unpaid member later", () => {
    const branch = WEBHOOK.slice(WEBHOOK.indexOf('if (plan === "pro")'));
    assert.match(branch, /listOpenInvites\(agency\.id\)/);
    assert.match(branch, /deleteInvite\(invite\)/);
  });

  it("resets seatsPurchased to the base seat, so a resubscribed owner cannot invite onto capacity nobody is paying for", () => {
    const branch = WEBHOOK.slice(WEBHOOK.indexOf('if (plan === "pro")'));
    assert.match(branch, /seatsPurchased: 1/);
  });

  it("checks the roster write, rather than trusting a member-clearing save that may have failed", () => {
    const branch = WEBHOOK.slice(WEBHOOK.indexOf('if (plan === "pro")'));
    assert.match(branch, /if \(!\(await writeAgency\(cleared\)\)\)/);
  });

  it("refuses a NEW invite once the owner's own plan has lapsed, not just once nobody owns the agency", () => {
    // Being the agency's owner (a fact about the record) and being paid up
    // on Pro (a fact about the account) can drift apart the moment the
    // subscription ends — the record survives, the plan does not.
    const branch = AGENCY_ROUTE.slice(AGENCY_ROUTE.indexOf('case "invite"'), AGENCY_ROUTE.indexOf('case "revoke-invite"'));
    assert.match(branch, /plan !== "pro"/);
    assert.match(branch, /403/);
  });
});

describe("who is traveling, agency-wide — the owner's view", () => {
  const TRAVELING_ROUTE = readFileSync("app/api/account/agency/traveling/route.ts", "utf8");

  it("is refused to anybody who is not the agency's owner", () => {
    // "an agency shares who you are, not your client list" (app/agency/page.tsx)
    // stays true for every member but the one whose subscription pays for it —
    // this is the one door where that is deliberately not the rule.
    assert.match(TRAVELING_ROUTE, /isOwner\(agency, account\.email\)/);
    assert.match(TRAVELING_ROUTE, /403/);
  });

  it("reads every member's own trips, not just the caller's", () => {
    assert.match(TRAVELING_ROUTE, /agency\.members\.map/);
    assert.match(TRAVELING_ROUTE, /getAccountData\(member\.account\)/);
  });

  it("only ever returns a trip actually in the traveling stage", () => {
    assert.match(TRAVELING_ROUTE, /=== "traveling"/);
  });
});
