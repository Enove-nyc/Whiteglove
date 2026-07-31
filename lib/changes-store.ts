// The change log, and putting a change back.
//
// Same private store and the same reasoning as the recycle bin: it must
// survive a mistake made in the database, and it needs no migration to work.
//
// WHO IS READ HERE, not passed in. Every writer in lib/content-admin.ts would
// otherwise have to be given the signed-in person, through a chain of callers
// that do not know or care — and one that forgot would silently log the wrong
// name, which is worse than no name at all.

import { cookies } from "next/headers";
import { ADMIN_WHO_COOKIE, adminIdentity } from "@/lib/admin-session";
import { type Change, type ChangeKind, type FieldChange, fieldsChanged, stillLogged } from "@/lib/changes";
import { isValidAccessToken } from "@/lib/secure-access";

const KEY = "white-glove:change-log";

export function changeLogAvailable() {
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

async function readAll(): Promise<Change[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Change[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: Change[]): Promise<boolean> {
  return (await redis(`set/${KEY}`, JSON.stringify(rows))) !== null;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Whose change this is.
 *
 * "The shared password" rather than a name when that is how they signed in —
 * which is true and is exactly what the admin session already says. Never a
 * guess at a person.
 */
async function whoIsChanging(): Promise<string> {
  try {
    const jar = await cookies();
    const identity = adminIdentity(
      jar.get(ADMIN_WHO_COOKIE)?.value,
      isValidAccessToken("admin", jar.get("white_glove_admin")?.value),
    );
    if (!identity) return "not signed in";
    return identity.how === "account" ? identity.email : "the shared password";
  } catch {
    // Outside a request — a script, a seed, a migration.
    return "the site itself";
  }
}

/**
 * Record what changed on one record.
 *
 * NEVER THROWS AND NEVER BLOCKS THE SAVE. The owner pressed save; if the log
 * cannot be written, the right outcome is that the change happened and the log
 * is one entry short.
 *
 * A save with nothing different in it is not recorded. Pressing save without
 * typing is not history, and a log full of those is one nobody reads.
 */
export async function recordChange(input: {
  kind: ChangeKind;
  rowId: string;
  title: string;
  before: Record<string, unknown> | null | undefined;
  after: Record<string, unknown>;
}): Promise<void> {
  if (!changeLogAvailable()) return;
  try {
    // No "before" means the record is new. A first save is not a change to
    // anything, and logging it as one would make every new listing look like
    // an edit that wiped fourteen fields.
    if (!input.before) return;
    const fields: FieldChange[] = fieldsChanged(input.before, input.after);
    if (!fields.length) return;

    const at = new Date().toISOString();
    const rows = await readAll();
    const entry: Change = {
      id: `${input.kind}:${input.rowId}:${at}`,
      kind: input.kind,
      rowId: input.rowId,
      title: input.title,
      who: await whoIsChanging(),
      at,
      fields,
    };
    await writeAll(stillLogged([entry, ...rows], today()));
  } catch (error) {
    console.error("[changes] could not record a change", error);
  }
}

/** What the log still holds, newest first. */
export async function listChanges(): Promise<Change[]> {
  if (!changeLogAvailable()) return [];
  const rows = await readAll();
  const kept = stillLogged(rows, today());
  if (kept.length !== rows.length) await writeAll(kept);
  return kept;
}

/** One entry by id, or null. */
export async function findChange(id: string): Promise<Change | null> {
  return (await listChanges()).find((row) => row.id === id) ?? null;
}

/** Take one out — after it has been put back, or when it is not wanted. */
export async function dropChange(id: string): Promise<boolean> {
  if (!changeLogAvailable()) return false;
  const rows = await readAll();
  if (!rows.some((row) => row.id === id)) return true;
  return writeAll(rows.filter((row) => row.id !== id));
}

/** Only the kinds this person is allowed to see. */
export function onlyChangeKinds(rows: Change[], allowed: ChangeKind[] | null): Change[] {
  return allowed ? rows.filter((row) => allowed.includes(row.kind)) : rows;
}
