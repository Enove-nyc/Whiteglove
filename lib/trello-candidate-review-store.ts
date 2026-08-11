/**
 * Private configuration and idempotency storage for candidate-review cards.
 *
 * Credentials never enter this store. The only persisted configuration is the
 * non-secret board/list scope and an explicit owner enablement switch. Card
 * mappings use a stable source candidate ID, not a transient database row ID.
 */

import { randomUUID } from "node:crypto";
import { isDbEnabled } from "@/lib/content-admin";
import {
  TRELLO_CANDIDATE_REVIEW_ENVIRONMENT,
  trelloCandidateReviewReadiness,
  type TrelloCandidateReviewReadiness,
  type TrelloCandidateReviewSettingsInput,
} from "@/lib/trello-candidate-review";
import type {
  TrelloCandidateCardMapping,
  TrelloCandidateCardMappingStore,
  TrelloCandidateCardMappingStatus,
  TrelloCandidateReviewSyncScope,
} from "@/lib/trello-candidate-review-sync";

const SETTINGS_ID = "candidate-review";

type SettingsRow = {
  id: string;
  boardId: string;
  reviewListId: string;
  doneListId: string;
  enabled: boolean;
};

type MappingRow = {
  candidateId: string;
  boardId: string;
  reviewListId: string;
  status: string;
  trelloCardId: string | null;
  cardUrl: string | null;
};

export type TrelloCandidateReviewSettingsState = {
  available: boolean;
  settings: TrelloCandidateReviewSettingsInput | null;
};

export type TrelloCandidateMappingSummary = {
  available: boolean;
  synced: number;
  creating: number;
  unknown: number;
};

export type TrelloCandidateReviewConfigurationSource = "admin" | "environment" | "none";

type ResolvedTrelloCandidateReviewConfiguration = {
  apiKey: string;
  token: string;
  boardId: string;
  reviewListId: string;
  doneListId: string;
  enabled: boolean;
  source: TrelloCandidateReviewConfigurationSource;
  configurationStoreAvailable: boolean;
  mappingStoreAvailable: boolean;
};

async function db() {
  if (!isDbEnabled()) throw new Error("The private content database is not connected.");
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

function cleanSettings(row: SettingsRow): TrelloCandidateReviewSettingsInput {
  return {
    boardId: row.boardId.trim(),
    reviewListId: row.reviewListId.trim(),
    doneListId: row.doneListId.trim(),
    enabled: Boolean(row.enabled),
  };
}

function status(value: string): TrelloCandidateCardMappingStatus {
  return value === "SYNCED" || value === "UNKNOWN" ? value : "CREATING";
}

function mappingFromRow(row: MappingRow): TrelloCandidateCardMapping {
  return {
    candidateId: row.candidateId,
    boardId: row.boardId,
    reviewListId: row.reviewListId,
    status: status(row.status),
    trelloCardId: row.trelloCardId,
    cardUrl: row.cardUrl,
  };
}

/**
 * The configuration table may not exist yet even when DATABASE_URL does. That
 * is a normal setup state and must not be mistaken for a connected workflow.
 */
export async function readTrelloCandidateReviewSettings(): Promise<TrelloCandidateReviewSettingsState> {
  if (!isDbEnabled()) return { available: false, settings: null };
  try {
    const prisma = await db();
    const rows = await prisma.$queryRaw<SettingsRow[]>`
      SELECT "id", "boardId", "reviewListId", "doneListId", "enabled"
      FROM "TrelloCandidateReviewSettings"
      WHERE "id" = ${SETTINGS_ID}
      LIMIT 1
    `;
    return { available: true, settings: rows[0] ? cleanSettings(rows[0]) : null };
  } catch {
    return { available: false, settings: null };
  }
}

export async function saveTrelloCandidateReviewSettings(settings: TrelloCandidateReviewSettingsInput): Promise<boolean> {
  if (!isDbEnabled()) return false;
  try {
    const prisma = await db();
    await prisma.$executeRaw`
      INSERT INTO "TrelloCandidateReviewSettings"
        ("id", "boardId", "reviewListId", "doneListId", "enabled", "createdAt", "updatedAt")
      VALUES
        (${SETTINGS_ID}, ${settings.boardId.trim()}, ${settings.reviewListId.trim()}, ${settings.doneListId.trim()}, ${settings.enabled}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO UPDATE SET
        "boardId" = EXCLUDED."boardId",
        "reviewListId" = EXCLUDED."reviewListId",
        "doneListId" = EXCLUDED."doneListId",
        "enabled" = EXCLUDED."enabled",
        "updatedAt" = CURRENT_TIMESTAMP
    `;
    return true;
  } catch {
    return false;
  }
}

export async function getTrelloCandidateMappingSummary(): Promise<TrelloCandidateMappingSummary> {
  if (!isDbEnabled()) return { available: false, synced: 0, creating: 0, unknown: 0 };
  try {
    const prisma = await db();
    const rows = await prisma.$queryRaw<Array<{ status: string; count: number | string }>>`
      SELECT "status", COUNT(*) AS "count"
      FROM "TrelloCandidateReviewCard"
      GROUP BY "status"
    `;
    const countFor = (wanted: string) => {
      const found = rows.find((row) => row.status === wanted)?.count ?? 0;
      return typeof found === "number" ? found : Number(found);
    };
    return {
      available: true,
      synced: countFor("SYNCED"),
      creating: countFor("CREATING"),
      unknown: countFor("UNKNOWN"),
    };
  } catch {
    return { available: false, synced: 0, creating: 0, unknown: 0 };
  }
}

async function resolvedConfiguration(): Promise<ResolvedTrelloCandidateReviewConfiguration> {
  const [stored, mappings] = await Promise.all([
    readTrelloCandidateReviewSettings(),
    getTrelloCandidateMappingSummary(),
  ]);
  const environment = {
    boardId: process.env.TRELLO_BOARD_ID?.trim() ?? "",
    reviewListId: process.env.TRELLO_REVIEW_LIST_ID?.trim() ?? "",
    doneListId: process.env.TRELLO_DONE_LIST_ID?.trim() ?? "",
    enabled: process.env.TRELLO_CANDIDATE_SYNC_ENABLED === "1",
  };
  const fromAdmin = stored.settings;
  const configured = fromAdmin ?? environment;
  const source: TrelloCandidateReviewConfigurationSource = fromAdmin
    ? "admin"
    : Object.values(environment).some(Boolean)
      ? "environment"
      : "none";

  return {
    apiKey: process.env.TRELLO_API_KEY?.trim() ?? "",
    token: process.env.TRELLO_TOKEN?.trim() ?? "",
    ...configured,
    source,
    configurationStoreAvailable: stored.available,
    mappingStoreAvailable: mappings.available,
  };
}

/**
 * Safe, client-facing readiness data. It contains no configuration values and
 * never contains the API key or token.
 */
export async function getTrelloCandidateReviewReadiness(): Promise<
  TrelloCandidateReviewReadiness & { source: TrelloCandidateReviewConfigurationSource }
> {
  const configured = await resolvedConfiguration();
  return {
    ...trelloCandidateReviewReadiness({
      credentialsConfigured: Boolean(configured.apiKey && configured.token),
      boardConfigured: Boolean(configured.boardId),
      reviewListConfigured: Boolean(configured.reviewListId),
      doneListConfigured: Boolean(configured.doneListId),
      enabled: configured.enabled,
      configurationStoreAvailable: configured.configurationStoreAvailable,
      mappingStoreAvailable: configured.mappingStoreAvailable,
    }),
    source: configured.source,
  };
}

/**
 * Runtime-only configuration for the protected sync action. Keep this out of
 * client components: `apiKey` and `token` are server environment values.
 */
export async function getTrelloCandidateReviewSyncConfiguration(): Promise<
  ResolvedTrelloCandidateReviewConfiguration & { scope: TrelloCandidateReviewSyncScope }
> {
  const configured = await resolvedConfiguration();
  return {
    ...configured,
    scope: {
      boardId: configured.boardId,
      reviewListId: configured.reviewListId,
      doneListId: configured.doneListId,
      enabled: configured.enabled,
      credentialsConfigured: Boolean(configured.apiKey && configured.token),
      mappingStoreAvailable: configured.mappingStoreAvailable,
    },
  };
}

async function mappingFor(candidateId: string): Promise<TrelloCandidateCardMapping | null> {
  const prisma = await db();
  const rows = await prisma.$queryRaw<MappingRow[]>`
    SELECT "candidateId", "boardId", "reviewListId", "status", "trelloCardId", "cardUrl"
    FROM "TrelloCandidateReviewCard"
    WHERE "candidateId" = ${candidateId}
    LIMIT 1
  `;
  return rows[0] ? mappingFromRow(rows[0]) : null;
}

async function reserveMapping(
  candidateId: string,
  scope: Pick<TrelloCandidateReviewSyncScope, "boardId" | "reviewListId">,
): ReturnType<TrelloCandidateCardMappingStore["reserve"]> {
  if (!isDbEnabled()) return { kind: "unavailable", message: "The private card mapping store is not connected." };
  try {
    const prisma = await db();
    const inserted = await prisma.$executeRaw`
      INSERT INTO "TrelloCandidateReviewCard"
        ("id", "candidateId", "boardId", "reviewListId", "status", "createdAt", "updatedAt")
      VALUES
        (${randomUUID()}, ${candidateId}, ${scope.boardId}, ${scope.reviewListId}, 'CREATING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("candidateId") DO NOTHING
    `;
    if (inserted > 0) return { kind: "reserved" };
    const existing = await mappingFor(candidateId);
    return existing
      ? { kind: "existing", mapping: existing }
      : { kind: "unavailable", message: "The private card mapping could not be read." };
  } catch {
    return { kind: "unavailable", message: "The private card mapping store is not ready." };
  }
}

async function updateMapping(
  candidateId: string,
  data: { status: TrelloCandidateCardMappingStatus; trelloCardId?: string | null; cardUrl?: string | null },
) {
  const prisma = await db();
  await prisma.$executeRaw`
    UPDATE "TrelloCandidateReviewCard"
    SET
      "status" = ${data.status},
      "trelloCardId" = ${data.trelloCardId ?? null},
      "cardUrl" = ${data.cardUrl ?? null},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "candidateId" = ${candidateId}
  `;
}

export function trelloCandidateCardMappingStore(): TrelloCandidateCardMappingStore {
  return {
    reserve: reserveMapping,
    markSynced: async (candidateId, trelloCardId, cardUrl) => {
      await updateMapping(candidateId, { status: "SYNCED", trelloCardId, cardUrl });
    },
    markUncertain: async (candidateId) => {
      await updateMapping(candidateId, { status: "UNKNOWN" });
    },
    release: async (candidateId) => {
      const prisma = await db();
      await prisma.$executeRaw`
        DELETE FROM "TrelloCandidateReviewCard"
        WHERE "candidateId" = ${candidateId} AND "status" = 'CREATING'
      `;
    },
  };
}

/** Environment variable names only; this is safe to show in the admin UI. */
export const TRELLO_CANDIDATE_REVIEW_ENVIRONMENT_NAMES = Object.values(TRELLO_CANDIDATE_REVIEW_ENVIRONMENT);
