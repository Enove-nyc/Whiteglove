import counts from "./_counts.json";
import drafts from "./_drafts.json";
import type { DedupeReport } from "./dedupe";
import {
  NESIYATOVA_REVIEW_GATES,
  sourceBackedCandidate,
  type CandidateDraftRow,
  type CandidateInput,
  type NesiyatovaHeritageCandidate,
} from "./schema";
import { sourceCatalog } from "./sources";

function draft(row: CandidateDraftRow): NesiyatovaHeritageCandidate {
  const input: CandidateInput = {
    ...row,
    publicationReadiness: "NEEDS_REVIEW",
    requiredBeforePublication: NESIYATOVA_REVIEW_GATES,
  };
  return sourceBackedCandidate(sourceCatalog, input);
}

const rows = drafts as CandidateDraftRow[];

export const nesiyatovaHeritageDedupeReport = {
  drafted: counts.drafted,
  kept: counts.kept,
  dropped: counts.dropped,
  byReason: counts.byReason,
  drops: [],
} as DedupeReport;

/**
 * Private NEEDS_REVIEW candidates from Nesiya Tova.
 * Beis hachaim, mikvaos and hachnasas orchim only. Nothing publishes.
 */
export const nesiyatovaHeritageCandidates: readonly NesiyatovaHeritageCandidate[] = rows.map(draft);
