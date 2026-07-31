// Who else can get in.
//
// Two separate grants, because they answer different questions:
//
//   • **Admin** — this person can open the admin portal and change the site.
//   • **Site access** — this person can look at the site while it is closed to
//     the public, without being told the shared password.
//
// They are deliberately not the same. Handing a relative the password so they
// can look at the site should not also hand them the ability to edit it, and a
// second admin should not have to be told the shared password to sign in.
//
// An admin grant can now be narrowed to some of the five areas — see
// lib/admin-permissions.ts for what they are and why nothing stored means
// everything.
//
// The owner is set by OWNER_EMAIL and always holds both. Nobody can take the
// owner's access away from inside the app, which means a mistake in this screen
// can never lock the owner out of their own site.

import { type AdminArea, grantedAreas } from "@/lib/admin-permissions";

/** Emails are compared lowercased and trimmed, the same way accounts store them. */
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type TeamMember = {
  email: string;
  name?: string;
  /** Can open the admin portal. */
  admin: boolean;
  /**
   * Which parts of the admin, when it should not be all of them.
   * Absent means all of them — see lib/admin-permissions.ts.
   */
  areas?: AdminArea[];
  /** Can view the site while it is closed to the public. */
  siteAccess: boolean;
  /** The owner, from OWNER_EMAIL. Cannot be edited or removed here. */
  owner: boolean;
  addedAt?: string;
  note?: string;
};

type StoredMember = Omit<TeamMember, "owner">;

const KEY = "white-glove:team";

function redisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function teamStorageAvailable() {
  return redisConfigured();
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

/** The founding owner. Always an admin, always allowed in, never removable. */
export function ownerEmail(): string {
  return normalizeEmail(process.env.OWNER_EMAIL || "");
}

async function readStored(): Promise<StoredMember[]> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredMember[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStored(members: StoredMember[]) {
  await redis(`set/${KEY}`, JSON.stringify(members));
}

/** Everyone with a grant, the owner first. */
export async function listTeam(): Promise<TeamMember[]> {
  const owner = ownerEmail();
  const stored = (await readStored()).filter((m) => m.email !== owner);
  const rows: TeamMember[] = stored.map((m) => ({ ...m, owner: false }));
  if (owner) {
    rows.unshift({ email: owner, admin: true, siteAccess: true, owner: true, name: "You" });
  }
  return rows;
}

export async function saveTeamMember(input: {
  email: string;
  name?: string;
  admin: boolean;
  areas?: readonly string[];
  siteAccess: boolean;
  note?: string;
}): Promise<{ ok: boolean; message: string }> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) return { ok: false, message: "Enter a valid email address." };
  if (email === ownerEmail()) return { ok: false, message: "That is your own account — you already have full access." };
  if (!redisConfigured()) return { ok: false, message: "This needs the private store connected. Ask for UPSTASH_REDIS_REST_URL and _TOKEN to be set." };

  // Areas only mean anything alongside an admin grant, and a narrowing that is
  // really "all five" is stored as no narrowing at all, so the record says what
  // it means.
  const areas = input.admin ? (grantedAreas(input.areas) ?? undefined) : undefined;

  const stored = await readStored();
  const existing = stored.findIndex((m) => m.email === email);
  const member: StoredMember = {
    email,
    name: input.name?.trim() || undefined,
    admin: input.admin,
    areas,
    siteAccess: input.siteAccess || input.admin, // an admin can always see the site
    note: input.note?.trim() || undefined,
    addedAt: existing >= 0 ? stored[existing].addedAt : new Date().toISOString(),
  };
  if (existing >= 0) stored[existing] = member;
  else stored.push(member);
  await writeStored(stored);

  const what = !member.admin
    ? "can now see the site while it is closed"
    : areas
      ? `can now open ${areas.length} of the five parts of the admin`
      : "can now open the admin area";
  return { ok: true, message: `Saved. ${email} ${what}.` };
}

export async function removeTeamMember(email: string): Promise<{ ok: boolean; message: string }> {
  const normalized = normalizeEmail(email);
  if (normalized === ownerEmail()) return { ok: false, message: "You cannot remove your own access." };
  const stored = await readStored();
  await writeStored(stored.filter((m) => m.email !== normalized));
  return { ok: true, message: `${normalized} no longer has access.` };
}

/** Is this signed-in account allowed to open the admin portal? */
export async function isAdminAccount(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (normalized && normalized === ownerEmail()) return true;
  const stored = await readStored();
  return stored.some((m) => m.email === normalized && m.admin);
}

/**
 * Which parts of the admin this account may use, or `null` for all of them.
 *
 * The owner is never restricted. Neither is somebody the team screen does not
 * list: the admin cookie is still what gets you in, and this is the narrowing
 * on top of it — inventing a restriction for a session we cannot match to a
 * record would lock people out on a Redis hiccup rather than protect anything.
 */
export async function adminAreasFor(email?: string | null): Promise<AdminArea[] | null> {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!normalized || normalized === ownerEmail()) return null;
  const stored = await readStored();
  const member = stored.find((m) => m.email === normalized);
  return member?.admin ? grantedAreas(member.areas) : null;
}

/** Is this signed-in account allowed to see the site while it is closed? */
export async function hasSiteAccess(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  if (normalized && normalized === ownerEmail()) return true;
  const stored = await readStored();
  return stored.some((m) => m.email === normalized && (m.siteAccess || m.admin));
}
