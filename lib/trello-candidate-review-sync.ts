/**
 * Idempotent, private candidate-card synchronization.
 *
 * This is deliberately dependency-inverted: the pure sync rule accepts a
 * mapping store and a Trello client. Runtime code supplies the database and
 * network implementations; tests can prove retry behavior without contacting
 * Trello. Nothing in this module can publish White Glove content.
 */

import {
  TRELLO_CANDIDATE_SYNC_BATCH_SIZE,
  trelloCandidateCardDraft,
  type TrelloCandidateReviewCandidate,
} from "@/lib/trello-candidate-review";

export type TrelloCandidateCardMappingStatus = "CREATING" | "SYNCED" | "UNKNOWN";

export type TrelloCandidateCardMapping = {
  candidateId: string;
  boardId: string;
  reviewListId: string;
  status: TrelloCandidateCardMappingStatus;
  trelloCardId: string | null;
  cardUrl: string | null;
};

export type TrelloCandidateReviewSyncScope = {
  boardId: string;
  reviewListId: string;
  doneListId: string;
  enabled: boolean;
  credentialsConfigured: boolean;
  mappingStoreAvailable: boolean;
};

export type TrelloCandidateCardMappingStore = {
  reserve: (
    candidateId: string,
    scope: Pick<TrelloCandidateReviewSyncScope, "boardId" | "reviewListId">,
  ) => Promise<
    | { kind: "reserved" }
    | { kind: "existing"; mapping: TrelloCandidateCardMapping }
    | { kind: "unavailable"; message: string }
  >;
  markSynced: (candidateId: string, trelloCardId: string, cardUrl: string | null) => Promise<void>;
  markUncertain: (candidateId: string) => Promise<void>;
  release: (candidateId: string) => Promise<void>;
};

export type TrelloCandidateCardClient = {
  verifyScope: (
    scope: Pick<TrelloCandidateReviewSyncScope, "boardId" | "reviewListId" | "doneListId">,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  createCard: (input: { reviewListId: string; card: ReturnType<typeof trelloCandidateCardDraft> }) => Promise<
    | { ok: true; cardId: string; cardUrl: string | null }
    | { ok: false; uncertain: boolean; message: string }
  >;
};

export type TrelloCandidateReviewSyncResult = {
  ok: boolean;
  message: string;
  created: number;
  alreadyMapped: number;
  blocked: number;
  failed: number;
  uncertain: number;
  attempted: number;
};

function emptyResult(message: string, ok = false): TrelloCandidateReviewSyncResult {
  return { ok, message, created: 0, alreadyMapped: 0, blocked: 0, failed: 0, uncertain: 0, attempted: 0 };
}

function batchSize(value: number | undefined): number {
  const requested = Math.floor(value ?? TRELLO_CANDIDATE_SYNC_BATCH_SIZE);
  return Math.min(Math.max(requested || TRELLO_CANDIDATE_SYNC_BATCH_SIZE, 1), 50);
}

/**
 * Creates at most a small batch, so a long import cannot turn one admin click
 * into hundreds of outbound requests. Existing mappings are skipped even
 * across retries. An ambiguous network result is held for manual
 * reconciliation rather than retried into a duplicate card.
 */
export async function syncTrelloCandidateReviewBatch(input: {
  candidates: readonly TrelloCandidateReviewCandidate[];
  scope: TrelloCandidateReviewSyncScope;
  mappingStore: TrelloCandidateCardMappingStore;
  trello: TrelloCandidateCardClient;
  batchSize?: number;
}): Promise<TrelloCandidateReviewSyncResult> {
  const { scope } = input;
  if (!scope.enabled) return emptyResult("Candidate-card sync is disabled. No cards were created.");
  if (!scope.credentialsConfigured) return emptyResult("Trello server credentials are not configured. No cards were created.");
  if (!scope.mappingStoreAvailable) return emptyResult("Private card mapping storage is not ready. No cards were created.");
  if (!scope.boardId || !scope.reviewListId || !scope.doneListId) {
    return emptyResult("The board, review list, and Done / approved list must be configured. No cards were created.");
  }

  const verified = await input.trello.verifyScope(scope);
  if (!verified.ok) return emptyResult(verified.message);

  const result = emptyResult("", true);
  const maximum = batchSize(input.batchSize);
  const seen = new Set<string>();

  for (const candidate of input.candidates) {
    if (candidate.status !== "NEEDS_REVIEW" || seen.has(candidate.candidateId)) continue;
    seen.add(candidate.candidateId);

    const reservation = await input.mappingStore.reserve(candidate.candidateId, scope);
    if (reservation.kind === "unavailable") {
      result.blocked += 1;
      continue;
    }
    if (reservation.kind === "existing") {
      const mapping = reservation.mapping;
      if (mapping.boardId !== scope.boardId || mapping.reviewListId !== scope.reviewListId) {
        result.blocked += 1;
      } else if (mapping.status === "SYNCED" && mapping.trelloCardId) {
        result.alreadyMapped += 1;
      } else {
        // A previous request may have reached Trello just before the network
        // failed. Do not retry a CREATING/UNKNOWN reservation automatically.
        result.blocked += 1;
      }
      continue;
    }

    result.attempted += 1;
    const card = await input.trello.createCard({ reviewListId: scope.reviewListId, card: trelloCandidateCardDraft(candidate) });
    if (!card.ok) {
      if (card.uncertain) {
        result.uncertain += 1;
        try {
          await input.mappingStore.markUncertain(candidate.candidateId);
        } catch {
          // The reservation remains CREATING, which safely blocks retries.
        }
      } else {
        result.failed += 1;
        try {
          await input.mappingStore.release(candidate.candidateId);
        } catch {
          // Keeping a reservation is safer than risking a duplicate on retry.
          result.blocked += 1;
        }
      }
      if (result.attempted >= maximum) break;
      continue;
    }

    try {
      await input.mappingStore.markSynced(candidate.candidateId, card.cardId, card.cardUrl);
      result.created += 1;
    } catch {
      // Trello has already accepted the card, but its ID was not persisted.
      // The original reservation remains and future retries stay blocked.
      result.uncertain += 1;
    }
    if (result.attempted >= maximum) break;
  }

  result.message =
    result.created || result.alreadyMapped || result.blocked || result.failed || result.uncertain
      ? `Created ${result.created}; already mapped ${result.alreadyMapped}; held ${result.blocked}; failed before creation ${result.failed}; needs reconciliation ${result.uncertain}.`
      : "There are no private candidates waiting for a Trello review card.";
  return result;
}
