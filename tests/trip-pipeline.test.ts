import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { emptyProposal, emptyProposalOption, type Proposal } from "@/data/proposal";
import { needsAttention, tripStage } from "@/data/trip-pipeline";

const TODAY = "2026-06-10";

function proposalWith(status: Proposal["status"]): Proposal {
  return { ...emptyProposal(), status, options: [emptyProposalOption("Option A")] };
}

describe("where a trip sits in the pipeline", () => {
  it("is an inquiry with no proposal and no manual stage", () => {
    assert.equal(tripStage({}, TODAY), "inquiry");
  });

  it("stays an inquiry until the planner marks it planning", () => {
    assert.equal(tripStage({ pipelineStage: "inquiry" }, TODAY), "inquiry");
  });

  it("is planning once the planner marks it so, with no proposal yet", () => {
    assert.equal(tripStage({ pipelineStage: "planning" }, TODAY), "planning");
  });

  it("a proposal with no options yet is still pre-proposal", () => {
    const proposal = { ...emptyProposal(), status: "draft" as const, options: [] };
    assert.equal(tripStage({ proposal, pipelineStage: "planning" }, TODAY), "planning");
  });

  it("a draft proposal with real options is the Proposal stage, regardless of the manual flag", () => {
    assert.equal(tripStage({ proposal: proposalWith("draft"), pipelineStage: "inquiry" }, TODAY), "proposal");
  });

  it("sent, viewed and changes-requested are all Awaiting approval", () => {
    assert.equal(tripStage({ proposal: proposalWith("sent") }, TODAY), "awaiting_approval");
    assert.equal(tripStage({ proposal: proposalWith("viewed") }, TODAY), "awaiting_approval");
    assert.equal(tripStage({ proposal: proposalWith("changes_requested") }, TODAY), "awaiting_approval");
  });

  it("approved with no dates set yet is Confirmed", () => {
    assert.equal(tripStage({ proposal: proposalWith("approved") }, TODAY), "confirmed");
  });

  it("approved and in the future is Confirmed", () => {
    assert.equal(tripStage({ proposal: proposalWith("approved"), startDate: "2026-07-01", endDate: "2026-07-10" }, TODAY), "confirmed");
  });

  it("approved and today falls within the trip's dates is Traveling", () => {
    assert.equal(tripStage({ proposal: proposalWith("approved"), startDate: "2026-06-01", endDate: "2026-06-15" }, TODAY), "traveling");
  });

  it("approved and past its end date is Completed", () => {
    assert.equal(tripStage({ proposal: proposalWith("confirmed"), startDate: "2026-01-01", endDate: "2026-01-10" }, TODAY), "completed");
  });

  it("never invents a stage past what the proposal and dates actually say — the manual flag is ignored once a real proposal exists", () => {
    assert.equal(tripStage({ proposal: proposalWith("sent"), pipelineStage: "inquiry" }, TODAY), "awaiting_approval");
  });
});

describe("whether a trip needs the planner's attention", () => {
  it("is true only when the client asked for changes", () => {
    assert.equal(needsAttention(proposalWith("changes_requested")), true);
    assert.equal(needsAttention(proposalWith("sent")), false);
    assert.equal(needsAttention(undefined), false);
  });
});

describe("the pipeline route keeps the same fences everything else does", () => {
  const ROUTE = readFileSync("app/api/account/pipeline/route.ts", "utf8");

  it("is Business-gated, the same as handing a trip to a client at all", () => {
    assert.match(ROUTE, /mayServeCompanionClients/);
  });

  it("checks same-origin before writing anything", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("savePipelineStage"), "same-origin is checked before the stage is ever saved");
  });

  it("only ever lets the planner set inquiry or planning by hand — never a stage a real proposal or the calendar should decide", () => {
    const post = ROUTE.slice(ROUTE.indexOf("export async function POST"));
    assert.match(post, /stage !== "inquiry" && stage !== "planning"/);
  });

  it("reads the account's own (or the business it's staff on) trips, never a trip id off the request", () => {
    assert.doesNotMatch(ROUTE, /getAccountData\(request/);
    assert.match(ROUTE, /getAccountData\(owner\)/);
  });

  it("reads outstanding payments from the trip's own balance, not a second number kept alongside it", () => {
    assert.match(ROUTE, /hasBalance\(t\.balance\)/);
    assert.match(ROUTE, /outstandingCents\(t\.balance\)/);
  });

  it("outstanding is absent, not zero, when no balance has been set up at all", () => {
    assert.match(ROUTE, /t\.balance && hasBalance\(t\.balance\) \? outstandingCents\(t\.balance\) : undefined/);
  });
});
