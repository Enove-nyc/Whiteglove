/**
 * Where an agency lives, where its open invites wait, and the one field on an
 * account record that says which agency it belongs to.
 *
 * THE ACCOUNT RECORD CARRIES ITS OWN agencyId, the same way it already
 * carries its own plan (lib/account-plan-store.ts) — read-modify-write on
 * the whole record, because a partial write would drop the password hash.
 * Nothing else about membership lives there: the agency's own record is the
 * one place that lists who is on it, so removing a member can never leave an
 * account pointing at an agency that no longer lists it.
 */

import { identityKey } from "@/lib/identity";
import { type AgencyInvite, type AgencyRecord } from "@/lib/agency";

const AGENCY_PREFIX = "white-glove:agency:";
const INVITE_PREFIX = "white-glove:agency-invite:";
const AGENCY_INVITES_PREFIX = "white-glove:agency-invites:";
const ACCOUNT_PREFIX = "white-glove:account:";

export function agencyStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

/* ---- the agency itself ---------------------------------------------------- */

export async function readAgency(id: string): Promise<AgencyRecord | null> {
  if (!id || !agencyStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(`${AGENCY_PREFIX}${id}`)}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AgencyRecord;
    return parsed && typeof parsed === "object" && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeAgency(record: AgencyRecord): Promise<boolean> {
  if (!agencyStoreAvailable()) return false;
  return (await redis(`set/${encodeURIComponent(`${AGENCY_PREFIX}${record.id}`)}`, JSON.stringify(record))) !== null;
}

function agencyId(): string {
  return `ag_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** A fresh, empty-but-for-the-owner agency. Not written yet — see createAgency. */
export function newAgency(owner: string, seatsPurchased: number): AgencyRecord {
  const now = new Date().toISOString();
  return {
    id: agencyId(),
    owner,
    members: [{ account: owner, role: "owner", joinedAt: now }],
    seatsPurchased,
    createdAt: now,
    updatedAt: now,
  };
}

/* ---- which agency an account belongs to ------------------------------------ */

type StoredAccount = Record<string, unknown> & { agencyId?: string };

async function readAccount(account: string): Promise<StoredAccount | null> {
  const raw = await redis<string>(`get/${encodeURIComponent(`${ACCOUNT_PREFIX}${identityKey(account)}`)}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAccount;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Which agency this account belongs to, if any. */
export async function agencyIdFor(account: string): Promise<string | undefined> {
  const record = await readAccount(account);
  return typeof record?.agencyId === "string" && record.agencyId ? record.agencyId : undefined;
}

/**
 * Put an account on — or take it off — an agency.
 *
 * Mirrors setPlan in lib/account-plan-store.ts exactly: read the whole
 * record, write it whole back, refuse rather than write a partial one if it
 * cannot be read.
 */
export async function setAccountAgency(account: string, id: string | undefined): Promise<boolean> {
  const record = await readAccount(account);
  if (!record) return false;
  const next = { ...record, agencyId: id };
  if (!id) delete next.agencyId;
  const key = encodeURIComponent(`${ACCOUNT_PREFIX}${identityKey(account)}`);
  return (await redis(`set/${key}/${encodeURIComponent(JSON.stringify(next))}`)) !== null;
}

/* ---- open invites ----------------------------------------------------------- */

function inviteKey(token: string) {
  return `${INVITE_PREFIX}${token}`;
}

function agencyInvitesKey(id: string) {
  return `${AGENCY_INVITES_PREFIX}${id}`;
}

export async function readInvite(token: string): Promise<AgencyInvite | null> {
  if (!token || !agencyStoreAvailable()) return null;
  const raw = await redis<string>(`get/${encodeURIComponent(inviteKey(token))}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AgencyInvite;
    return parsed && typeof parsed === "object" && parsed.token ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeInvite(invite: AgencyInvite): Promise<boolean> {
  if (!agencyStoreAvailable()) return false;
  const ok = (await redis(`set/${encodeURIComponent(inviteKey(invite.token))}`, JSON.stringify(invite))) !== null;
  if (!ok) return false;
  await redis(`sadd/${encodeURIComponent(agencyInvitesKey(invite.agencyId))}`, JSON.stringify([invite.token]));
  return true;
}

export async function deleteInvite(invite: AgencyInvite): Promise<boolean> {
  if (!agencyStoreAvailable()) return false;
  await redis(`srem/${encodeURIComponent(agencyInvitesKey(invite.agencyId))}`, JSON.stringify([invite.token]));
  return (await redis(`del/${encodeURIComponent(inviteKey(invite.token))}`)) !== null;
}

/** Every invite this agency has open right now, expired ones dropped rather than counted. */
export async function listOpenInvites(id: string): Promise<AgencyInvite[]> {
  if (!agencyStoreAvailable()) return [];
  const tokens = await redis<string[]>(`smembers/${encodeURIComponent(agencyInvitesKey(id))}`);
  if (!Array.isArray(tokens)) return [];
  const now = Date.now();
  const invites: AgencyInvite[] = [];
  for (const token of tokens) {
    const invite = await readInvite(token);
    if (!invite) {
      // A stale index entry — the invite itself is gone. Tidy the set as we go.
      await redis(`srem/${encodeURIComponent(agencyInvitesKey(id))}`, JSON.stringify([token]));
      continue;
    }
    if (Date.parse(invite.expiresAt) < now) {
      await deleteInvite(invite);
      continue;
    }
    invites.push(invite);
  }
  return invites;
}
