import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getTrelloCandidateReviewCandidates } from "@/lib/trello-candidate-review-candidates";
import {
  buildTrelloCandidateReviewExport,
  trelloCandidateCardDraft,
  trelloCandidateReviewReadiness,
  trelloCandidateReviewSettingsProblem,
  type TrelloCandidateReviewCandidate,
} from "@/lib/trello-candidate-review";
import {
  syncTrelloCandidateReviewBatch,
  type TrelloCandidateCardClient,
  type TrelloCandidateCardMapping,
  type TrelloCandidateCardMappingStore,
  type TrelloCandidateReviewSyncScope,
} from "@/lib/trello-candidate-review-sync";

const candidate: TrelloCandidateReviewCandidate = {
  candidateId: "official-example-museum",
  batchLabel: "Worldwide editorial review pack",
  name: "Example Museum",
  typeLabel: "Attraction",
  category: "Museum",
  destination: "London",
  country: "United Kingdom",
  sourceUrl: "https://example-museum.test/visit",
  sourceId: "official:example-museum",
  sourceName: "Example Museum",
  attribution: "Example Museum",
  license: null,
  sourceType: "official_museum",
  sourceEvidence: "Official visitor information for the museum.",
  sourceLastChecked: "2026-08-11",
  status: "NEEDS_REVIEW",
};

const scope: TrelloCandidateReviewSyncScope = {
  boardId: "board12345678",
  reviewListId: "review12345678",
  doneListId: "done123456789",
  enabled: true,
  credentialsConfigured: true,
  mappingStoreAvailable: true,
};

function inMemoryStore() {
  const records = new Map<string, TrelloCandidateCardMapping>();
  const store: TrelloCandidateCardMappingStore = {
    reserve: async (candidateId, nextScope) => {
      const existing = records.get(candidateId);
      if (existing) return { kind: "existing", mapping: existing };
      records.set(candidateId, {
        candidateId,
        boardId: nextScope.boardId,
        reviewListId: nextScope.reviewListId,
        status: "CREATING",
        trelloCardId: null,
        cardUrl: null,
      });
      return { kind: "reserved" };
    },
    markSynced: async (candidateId, trelloCardId, cardUrl) => {
      const existing = records.get(candidateId);
      assert.ok(existing);
      records.set(candidateId, { ...existing, status: "SYNCED", trelloCardId, cardUrl });
    },
    markUncertain: async (candidateId) => {
      const existing = records.get(candidateId);
      assert.ok(existing);
      records.set(candidateId, { ...existing, status: "UNKNOWN" });
    },
    release: async (candidateId) => {
      records.delete(candidateId);
    },
  };
  return { records, store };
}

function fakeTrello(calls: { verify: number; create: number }): TrelloCandidateCardClient {
  return {
    verifyScope: async () => {
      calls.verify += 1;
      return { ok: true };
    },
    createCard: async ({ card }) => {
      calls.create += 1;
      return { ok: true, cardId: `card-${card.candidateId}`, cardUrl: "https://trello.com/c/example" };
    },
  };
}

describe("candidate Trello payloads", () => {
  it("carries source provenance and the required internal checklist", () => {
    const card = trelloCandidateCardDraft(candidate);
    assert.match(card.name, /Example Museum/);
    assert.match(card.name, /London/);
    assert.match(card.name, /Attraction/);
    assert.match(card.desc, /Candidate ID: official-example-museum/);
    assert.match(card.desc, /Source URL: https:\/\/example-museum\.test\/visit/);
    assert.match(card.desc, /Source type: official_museum/);
    assert.match(card.desc, /Attribution: Example Museum/);
    assert.match(card.desc, /Source evidence: Official visitor information for the museum/);
    assert.match(card.desc, /Source last checked: 2026-08-11/);
    for (const item of [
      "Source reviewed",
      "Destination/location checked",
      "Customer-ready summary completed",
      "Kosher/practical claim checked where applicable",
      "Approved for public publishing",
    ]) {
      assert.match(card.desc, new RegExp(`\\[ \\] ${item}`));
    }
  });

  it("exports only private review candidates and never credentials", () => {
    const published = { ...candidate, candidateId: "published-source", status: "PUBLISHED" as const };
    const payload = buildTrelloCandidateReviewExport([candidate, candidate, published], "2026-08-11T00:00:00.000Z");
    assert.equal(payload.visibility, "internal-only");
    assert.equal(payload.candidates.length, 1);
    assert.match(payload.notice, /does not publish/i);
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /TRELLO_API_KEY|TRELLO_TOKEN|secret-key|secret-token/i);
  });

  it("requires separate review and Done lists", () => {
    assert.match(
      trelloCandidateReviewSettingsProblem({
        boardId: "board12345678",
        reviewListId: "same12345678",
        doneListId: "same12345678",
        enabled: true,
      })!,
      /must be different/i,
    );
  });
});

describe("candidate Trello synchronization", () => {
  it("does nothing while disabled or unconfigured", async () => {
    const disabledCalls = { verify: 0, create: 0 };
    const result = await syncTrelloCandidateReviewBatch({
      candidates: [candidate],
      scope: { ...scope, enabled: false },
      mappingStore: inMemoryStore().store,
      trello: fakeTrello(disabledCalls),
    });
    assert.equal(result.ok, false);
    assert.equal(disabledCalls.verify, 0);
    assert.equal(disabledCalls.create, 0);
    assert.match(result.message, /disabled/i);

    const unconfiguredCalls = { verify: 0, create: 0 };
    const unconfigured = await syncTrelloCandidateReviewBatch({
      candidates: [candidate],
      scope: { ...scope, credentialsConfigured: false },
      mappingStore: inMemoryStore().store,
      trello: fakeTrello(unconfiguredCalls),
    });
    assert.equal(unconfigured.ok, false);
    assert.equal(unconfiguredCalls.verify, 0);
    assert.equal(unconfiguredCalls.create, 0);
    assert.match(unconfigured.message, /credentials/i);

    const readiness = trelloCandidateReviewReadiness({
      credentialsConfigured: false,
      boardConfigured: false,
      reviewListConfigured: false,
      doneListConfigured: false,
      enabled: false,
      configurationStoreAvailable: false,
      mappingStoreAvailable: false,
    });
    assert.equal(readiness.ready, false);
    assert.match(readiness.message, /server credentials/i);
  });

  it("persists the candidate-to-card mapping so retries cannot duplicate cards", async () => {
    const memory = inMemoryStore();
    const calls = { verify: 0, create: 0 };
    const trello = fakeTrello(calls);

    const first = await syncTrelloCandidateReviewBatch({
      candidates: [candidate],
      scope,
      mappingStore: memory.store,
      trello,
      batchSize: 1,
    });
    const second = await syncTrelloCandidateReviewBatch({
      candidates: [candidate],
      scope,
      mappingStore: memory.store,
      trello,
      batchSize: 1,
    });

    assert.equal(first.created, 1);
    assert.equal(second.created, 0);
    assert.equal(second.alreadyMapped, 1);
    assert.equal(calls.verify, 2);
    assert.equal(calls.create, 1);
    assert.equal(memory.records.get(candidate.candidateId)?.trelloCardId, "card-official-example-museum");
  });

  it("has no code path from a card sync to public publishing", () => {
    const syncSource = readFileSync("lib/trello-candidate-review-sync.ts", "utf8");
    const candidateSource = readFileSync("lib/trello-candidate-review-candidates.ts", "utf8");
    const actionsSource = readFileSync("app/admin/imports/trello/actions.ts", "utf8");
    assert.doesNotMatch(syncSource, /publishContentImportCandidate|PUBLISHED/);
    assert.doesNotMatch(candidateSource, /content-imports|getContentImportDashboard/);
    assert.doesNotMatch(actionsSource, /publishContentImportCandidate/);
  });
});

describe("current private candidate sources", () => {
  it("uses the source-attributed editorial pack without publishing candidates", () => {
    const sourceSet = getTrelloCandidateReviewCandidates();
    assert.equal(sourceSet.sourceLabel, "Worldwide editorial review pack");
    assert.equal(sourceSet.sourceAvailable, true);
    assert.equal(sourceSet.withheldForMissingProvenance, 0);
    assert.equal(sourceSet.candidates.length, 152);
    for (const item of sourceSet.candidates) {
      assert.equal(item.status, "NEEDS_REVIEW");
      assert.ok(item.sourceUrl);
      assert.ok(item.sourceId);
      assert.ok(item.sourceName);
      assert.ok(item.attribution);
      assert.ok(item.sourceEvidence);
      assert.ok(item.sourceLastChecked);
    }
  });

  it("keeps retired map-source data out of the review workflow", () => {
    const reviewWorkflowFiles = [
      "lib/trello-candidate-review-candidates.ts",
      "lib/trello-candidate-review.ts",
      "lib/trello-candidate-review-runtime.ts",
      "lib/trello-candidate-review-store.ts",
      "lib/trello-candidate-review-sync.ts",
      "app/admin/imports/trello/actions.ts",
      "app/admin/imports/trello/page.tsx",
      "app/api/admin/imports/trello/export/route.ts",
      "components/TrelloCandidateReviewPanel.tsx",
      "app/admin/imports/page.tsx",
      "lib/admin-nav.ts",
      "prisma/migrations/20260811160000_trello_candidate_review/migration.sql",
      "tests/trello-candidate-review.test.ts",
    ];
    const forbiddenSourceTerms = [
      ["open", "street", "map"].join(""),
      ["over", "pass"].join(""),
      ["od", "bl"].join(""),
      ["o", "s", "m"].join(""),
    ];

    for (const file of reviewWorkflowFiles) {
      const source = readFileSync(file, "utf8").toLocaleLowerCase("en");
      for (const term of forbiddenSourceTerms) {
        assert.equal(source.includes(term), false, `${file} contains a retired map-source reference`);
      }
    }

    for (const item of getTrelloCandidateReviewCandidates().candidates) {
      const provenance = [
        item.batchLabel,
        item.sourceUrl,
        item.sourceId,
        item.sourceName,
        item.attribution,
        item.license,
        item.sourceType,
        item.sourceEvidence,
      ]
        .filter((value): value is string => typeof value === "string")
        .join("\n")
        .toLocaleLowerCase("en");
      for (const term of forbiddenSourceTerms) {
        assert.equal(provenance.includes(term), false, `${item.candidateId} has a retired map-source reference`);
      }
    }
  });
});
