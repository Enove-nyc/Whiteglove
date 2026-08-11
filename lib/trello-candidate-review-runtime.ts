/**
 * Server-side Trello client for the candidate-review workflow.
 *
 * This is the only new module that handles the API key and token. It never
 * serializes them, logs them, or exposes them through an admin response.
 */

import { getTrelloCandidateReviewCandidates } from "@/lib/trello-candidate-review-candidates";
import {
  getTrelloCandidateReviewSyncConfiguration,
  trelloCandidateCardMappingStore,
} from "@/lib/trello-candidate-review-store";
import {
  syncTrelloCandidateReviewBatch,
  type TrelloCandidateCardClient,
  type TrelloCandidateReviewSyncResult,
} from "@/lib/trello-candidate-review-sync";

type TrelloList = { id?: unknown; idBoard?: unknown };

function trelloUrl(path: string, credentials: { apiKey: string; token: string }, fields?: string): URL {
  const url = new URL(`https://api.trello.com/1${path}`);
  url.searchParams.set("key", credentials.apiKey);
  url.searchParams.set("token", credentials.token);
  if (fields) url.searchParams.set("fields", fields);
  return url;
}

function trelloFailure(status: number, what: string): string {
  if (status === 401 || status === 403) return `Trello rejected the server credentials while checking ${what}.`;
  if (status === 404) return `Trello could not find the configured ${what}.`;
  if (status === 429) return `Trello is rate-limiting this connection while checking ${what}.`;
  return `Trello could not verify ${what} (status ${status}).`;
}

function trelloCandidateReviewClient(credentials: { apiKey: string; token: string }): TrelloCandidateCardClient {
  async function readList(listId: string): Promise<{ ok: true; list: TrelloList } | { ok: false; message: string }> {
    try {
      const response = await fetch(
        trelloUrl(`/lists/${encodeURIComponent(listId)}`, credentials, "id,idBoard"),
        { cache: "no-store" },
      );
      if (!response.ok) return { ok: false, message: trelloFailure(response.status, "list") };
      const payload = (await response.json()) as TrelloList;
      if (typeof payload.id !== "string" || typeof payload.idBoard !== "string") {
        return { ok: false, message: "Trello returned an incomplete list response. No candidate cards were created." };
      }
      return { ok: true, list: payload };
    } catch {
      return { ok: false, message: "Trello could not be reached to verify the configured lists. No candidate cards were created." };
    }
  }

  return {
    verifyScope: async ({ boardId, reviewListId, doneListId }) => {
      if (reviewListId === doneListId) {
        return { ok: false, message: "The review list and Done / approved list must be different. No candidate cards were created." };
      }
      const review = await readList(reviewListId);
      if (!review.ok) return review;
      if (review.list.idBoard !== boardId) {
        return { ok: false, message: "The configured review list is not on the configured board. No candidate cards were created." };
      }

      const done = await readList(doneListId);
      if (!done.ok) return done;
      if (done.list.idBoard !== boardId) {
        return { ok: false, message: "The configured Done / approved list is not on the configured board. No candidate cards were created." };
      }
      return { ok: true };
    },

    createCard: async ({ reviewListId, card }) => {
      try {
        const url = trelloUrl("/cards", credentials);
        url.searchParams.set("idList", reviewListId);
        url.searchParams.set("name", card.name);
        url.searchParams.set("desc", card.desc);
        url.searchParams.set("pos", "top");
        const response = await fetch(url, { method: "POST", cache: "no-store" });
        if (!response.ok) {
          return {
            ok: false,
            // A non-2xx response is a definite rejection; release the mapping
            // reservation so a corrected configuration can retry safely.
            uncertain: false,
            message: trelloFailure(response.status, "review list"),
          };
        }
        const payload = (await response.json()) as { id?: unknown; url?: unknown };
        if (typeof payload.id !== "string") {
          // Trello accepted the request but did not return an identifiable
          // card. Preserve the reservation and require reconciliation.
          return { ok: false, uncertain: true, message: "Trello accepted an incomplete card response; reconcile it before retrying." };
        }
        return { ok: true, cardId: payload.id, cardUrl: typeof payload.url === "string" ? payload.url : null };
      } catch {
        // A network failure could happen after Trello created the card. The
        // sync engine records UNKNOWN and will not retry automatically.
        return { ok: false, uncertain: true, message: "Trello could not be reached while creating a card; reconcile it before retrying." };
      }
    },
  };
}

/**
 * Protected admin action entry point. It validates board/list scope before
 * making any card and processes a small idempotent batch.
 */
export async function runTrelloCandidateReviewSync(): Promise<TrelloCandidateReviewSyncResult> {
  const configured = await getTrelloCandidateReviewSyncConfiguration();
  const candidates = await getTrelloCandidateReviewCandidates();
  return syncTrelloCandidateReviewBatch({
    candidates: candidates.candidates,
    scope: configured.scope,
    mappingStore: trelloCandidateCardMappingStore(),
    trello: trelloCandidateReviewClient({ apiKey: configured.apiKey, token: configured.token }),
  });
}
