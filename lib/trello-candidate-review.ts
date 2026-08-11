/**
 * Private Trello review payloads for bulk-import candidates.
 *
 * This module intentionally knows nothing about Trello credentials, the
 * database, or public publishing. It only turns source-backed private review
 * candidates into safe internal card/export payloads.
 */

export const TRELLO_CANDIDATE_REVIEW_ENVIRONMENT = {
  apiKey: "TRELLO_API_KEY",
  token: "TRELLO_TOKEN",
  boardId: "TRELLO_BOARD_ID",
  reviewListId: "TRELLO_REVIEW_LIST_ID",
  doneListId: "TRELLO_DONE_LIST_ID",
  syncEnabled: "TRELLO_CANDIDATE_SYNC_ENABLED",
} as const;

export const TRELLO_CANDIDATE_SYNC_BATCH_SIZE = 25;

export type TrelloCandidateReviewStatus = "NEEDS_REVIEW" | "DUPLICATE" | "REJECTED" | "PUBLISHED";

/**
 * The narrow, provenance-only shape allowed into an internal Trello card.
 * It retains source identity and a compact provenance note, but excludes
 * visitor information and unreviewed customer copy.
 */
export type TrelloCandidateReviewCandidate = {
  candidateId: string;
  batchLabel: string;
  name: string;
  typeLabel: string;
  category: string | null;
  destination: string;
  country: string;
  sourceUrl: string;
  sourceId: string;
  sourceName: string;
  attribution: string;
  license: string | null;
  sourceType?: string | null;
  sourceEvidence?: string | null;
  sourceLastChecked?: string | null;
  status: TrelloCandidateReviewStatus;
};

export type TrelloCandidateCardDraft = {
  candidateId: string;
  name: string;
  desc: string;
};

export type TrelloCandidateReviewExport = {
  version: 1;
  generatedAt: string;
  visibility: "internal-only";
  notice: string;
  candidates: TrelloCandidateCardDraft[];
};

export type TrelloCandidateReviewSettingsInput = {
  boardId: string;
  reviewListId: string;
  doneListId: string;
  enabled: boolean;
};

export type TrelloCandidateReviewReadiness = {
  ready: boolean;
  credentialsConfigured: boolean;
  boardConfigured: boolean;
  reviewListConfigured: boolean;
  doneListConfigured: boolean;
  enabled: boolean;
  configurationStoreAvailable: boolean;
  mappingStoreAvailable: boolean;
  missing: string[];
  message: string;
};

function oneLine(value: string | null | undefined, maximum = 240): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function describeLocation(candidate: TrelloCandidateReviewCandidate): string {
  return [oneLine(candidate.destination, 140), oneLine(candidate.country, 140)].filter(Boolean).join(", ");
}

function cardLine(label: string, value: string | null | undefined, maximum?: number): string | null {
  const safe = oneLine(value, maximum);
  return safe ? `- ${label}: ${safe}` : null;
}

export function trelloCandidateCardTitle(candidate: TrelloCandidateReviewCandidate): string {
  const name = oneLine(candidate.name, 110) || "Unnamed listing candidate";
  const context = [describeLocation(candidate), oneLine(candidate.typeLabel, 80)].filter(Boolean).join(" · ");
  return oneLine(context ? `${name} — ${context}` : name, 160);
}

/**
 * The card tells a reviewer what to verify without treating a private lead as
 * customer-ready copy. Trello movements are deliberately informational only.
 */
export function trelloCandidateCardDraft(candidate: TrelloCandidateReviewCandidate): TrelloCandidateCardDraft {
  const sourceFacts = [
    cardLine("Source URL", candidate.sourceUrl, 2_000),
    cardLine("Source", candidate.sourceName),
    cardLine("Source type", candidate.sourceType),
    cardLine("Attribution", candidate.attribution, 500),
    cardLine("Source evidence", candidate.sourceEvidence, 700),
    cardLine("Source last checked", candidate.sourceLastChecked, 80),
    cardLine("License", candidate.license, 300),
    cardLine("Source ID", candidate.sourceId, 300),
  ].filter((line): line is string => Boolean(line));

  const details = [
    cardLine("Candidate ID", candidate.candidateId, 300),
    cardLine("Source package", candidate.batchLabel),
    cardLine("Category", candidate.category),
    cardLine("Destination", describeLocation(candidate), 280),
    cardLine("Type", candidate.typeLabel),
  ].filter((line): line is string => Boolean(line));

  const desc = [
    "Internal review only. This is a private source-backed candidate, not customer-facing content.",
    "Assign this card and use the board's Done / approved list when the review is complete. Moving the card never publishes anything on White Glove.",
    "",
    "Candidate",
    ...details,
    "",
    "Source provenance",
    ...sourceFacts,
    "",
    "Internal checklist",
    "- [ ] Source reviewed",
    "- [ ] Destination/location checked",
    "- [ ] Customer-ready summary completed",
    "- [ ] Kosher/practical claim checked where applicable",
    "- [ ] Approved for public publishing",
    "",
    "Public publishing remains a separate, explicit action in the White Glove admin.",
  ].join("\n");

  return {
    candidateId: oneLine(candidate.candidateId, 300),
    name: trelloCandidateCardTitle(candidate),
    desc,
  };
}

/**
 * Export only candidates that still need private review. Rejected, duplicate,
 * and already-published records cannot be reintroduced through this workflow.
 */
export function buildTrelloCandidateReviewExport(
  candidates: readonly TrelloCandidateReviewCandidate[],
  generatedAt = new Date().toISOString(),
): TrelloCandidateReviewExport {
  const seen = new Set<string>();
  const cards = candidates
    .filter((candidate) => candidate.status === "NEEDS_REVIEW")
    .filter((candidate) => {
      const id = oneLine(candidate.candidateId, 300);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map(trelloCandidateCardDraft);

  return {
    version: 1,
    generatedAt,
    visibility: "internal-only",
    notice:
      "This export is for internal verification only. Importing, assigning, moving, or completing a card does not publish a White Glove listing.",
    candidates: cards,
  };
}

function identifierProblem(label: string, value: string): string | null {
  const id = value.trim();
  if (!id) return `${label} is required.`;
  if (/^https?:/i.test(id)) return `${label} must be the Trello ID, not a URL.`;
  if (!/^[A-Za-z0-9_-]{8,}$/.test(id)) return `${label} must be a Trello ID.`;
  return null;
}

export function trelloCandidateReviewSettingsProblem(settings: TrelloCandidateReviewSettingsInput): string | null {
  const problem = (
    identifierProblem("Board ID", settings.boardId) ??
    identifierProblem("Review list ID", settings.reviewListId) ??
    identifierProblem("Done / approved list ID", settings.doneListId)
  );
  if (problem) return problem;
  if (settings.reviewListId.trim() === settings.doneListId.trim()) {
    return "The review list and Done / approved list must be different.";
  }
  return null;
}

export function trelloCandidateReviewReadiness(input: {
  credentialsConfigured: boolean;
  boardConfigured: boolean;
  reviewListConfigured: boolean;
  doneListConfigured: boolean;
  enabled: boolean;
  configurationStoreAvailable: boolean;
  mappingStoreAvailable: boolean;
}): TrelloCandidateReviewReadiness {
  const missing: string[] = [];
  if (!input.credentialsConfigured) missing.push("server credentials");
  if (!input.boardConfigured) missing.push("board ID");
  if (!input.reviewListConfigured) missing.push("review list ID");
  if (!input.doneListConfigured) missing.push("Done / approved list ID");
  if (!input.enabled) missing.push("owner-enabled sync");
  if (!input.mappingStoreAvailable) missing.push("private card mapping storage");

  const ready = missing.length === 0;
  return {
    ready,
    credentialsConfigured: input.credentialsConfigured,
    boardConfigured: input.boardConfigured,
    reviewListConfigured: input.reviewListConfigured,
    doneListConfigured: input.doneListConfigured,
    enabled: input.enabled,
    configurationStoreAvailable: input.configurationStoreAvailable,
    mappingStoreAvailable: input.mappingStoreAvailable,
    missing,
    message: ready
      ? "Ready for a protected sync. Trello will still verify that both configured lists belong to the configured board before creating cards."
      : `Not ready to sync: ${missing.join(", ")}.`,
  };
}
