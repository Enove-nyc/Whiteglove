import { currentAdmin } from "@/lib/admin-current";
import { coarseIp } from "@/lib/signin-log";
import { type AdminAction, type AdminActionKind, type AdminActor, KEEP_COUNT, stillLogged } from "@/lib/admin-actions";

/**
 * Writing and reading the admin action log. Server only.
 *
 * NO CLEAR FUNCTION, DELIBERATELY. See lib/admin-actions.ts: a record the
 * recorded party can erase is not a record. Nothing in this file empties the
 * list and nothing should be added that does — the cap below is a cap, not a
 * button.
 *
 * BEST EFFORT, ALWAYS. Recording an action must never be able to fail the
 * action. Somebody removing a compromised account's access, with the private
 * store having a bad minute, must still have removed it. A missing line is bad;
 * a grant that silently did not happen because the audit log was unreachable
 * is worse, and would be discovered at the worst possible time.
 */

const KEY = "white-glove:admin-actions";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function adminActionLogAvailable() {
  return Boolean(redisConfig());
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${config.token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { result?: T }).result ?? null;
  } catch {
    return null;
  }
}

/**
 * Who is doing this, read from the session and from nowhere else.
 *
 * Never from a parameter, never from the request body. An audit log that takes
 * the actor's name from the caller records whatever the caller says it did,
 * which is worse than no log: it is a log that will confidently name the wrong
 * person.
 */
export async function currentActor(): Promise<AdminActor | null> {
  const { identity } = await currentAdmin();
  if (!identity) return null;
  return identity.how === "account" ? { how: "account", email: identity.email } : { how: "shared" };
}

/** One line, appended and capped. The cap is a cap, not a way to empty it. */
async function append(entry: AdminAction): Promise<void> {
  await redis(`lpush/${encodeURIComponent(KEY)}`, JSON.stringify([JSON.stringify(entry)]));
  await redis(`ltrim/${encodeURIComponent(KEY)}/0/${KEEP_COUNT - 1}`);
}

/**
 * Roughly where a request came from — the same shape and the same restraint as
 * the sign-in log: a country, a town, and an address with its last part
 * dropped, which tells one visitor from another without the site holding a
 * record that identifies somebody's connection.
 */
function placeOf(headers: { get(name: string): string | null }) {
  const country = headers.get("x-vercel-ip-country");
  const city = headers.get("x-vercel-ip-city");
  const ip = coarseIp(headers.get("x-forwarded-for"));
  return { ...(country ? { country } : {}), ...(city ? { city } : {}), ...(ip ? { ip } : {}) };
}

/**
 * Record one action.
 *
 * Called from the route or action that performed it, AFTER it succeeded — a
 * log of things that were attempted is a different and less useful thing, and
 * would say somebody removed an account when the write had failed.
 *
 * Pass `headers` where the handler has them, so the line can say roughly where
 * it came from.
 */
export async function recordAdminAction(
  input: { kind: AdminActionKind; subject?: string; detail?: string },
  headers?: { get(name: string): string | null },
): Promise<void> {
  try {
    const actor = await currentActor();
    // Nobody signed in means nothing performed the action either — every
    // caller is already behind an admin check. Recording an actorless line
    // would put "unknown" in an audit log, which is the one thing it must
    // never say when it does in fact know.
    if (!actor) return;
    await append({
      at: new Date().toISOString(),
      actor,
      kind: input.kind,
      ...(input.subject ? { subject: input.subject } : {}),
      ...(input.detail ? { detail: input.detail } : {}),
      ...(headers ? placeOf(headers) : {}),
    });
  } catch {
    // Never fails the thing it was recording. Somebody removing a compromised
    // account's access, with the store having a bad minute, must still have
    // removed it: a missing line is bad, and a grant that silently did not
    // happen is worse and is found out at the worst possible moment.
  }
}

/**
 * Newest first, and already inside the retention window.
 *
 * Aged out HERE rather than by the screen. A page that calls Date.now() while
 * rendering is not a pure render — the repo's react-hooks/purity rule says so
 * and is right — and the retention rule belongs with the store that keeps the
 * rows anyway, not with each place that happens to show them.
 */
export async function readAdminActions(limit = KEEP_COUNT): Promise<AdminAction[]> {
  const rows = await redis<string[]>(`lrange/${encodeURIComponent(KEY)}/0/${Math.max(0, limit - 1)}`);
  if (!Array.isArray(rows)) return [];
  const out: AdminAction[] = [];
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row) as AdminAction;
      if (parsed?.at && parsed.kind && parsed.actor) out.push(parsed);
    } catch {
      // One unreadable line does not lose the rest.
    }
  }
  return stillLogged(out, Date.now());
}
