/**
 * What was done to the site's own controls, and by whom.
 *
 * THREE LOGS, THREE QUESTIONS, AND THEY ARE NOT THE SAME QUESTION.
 *
 *   lib/signin-log.ts    — who came IN. One line per successful entry.
 *   lib/changes.ts       — what the CONTENT says, and what it said before.
 *   here                 — who changed who can get in, and what they can do.
 *
 * The third was missing, and it is the one that matters after something goes
 * wrong. The admin could already tell you that somebody signed in at 11:40 and
 * that a town's overview was rewritten at 11:42. It could not tell you that
 * between those two, an account was granted the finances, the site password
 * was changed, or two-factor was turned off — the actions somebody takes when
 * they should not be there at all, and precisely the ones that leave no trace
 * in either of the other two.
 *
 * Two-factor without this is half a control: a second factor that anybody
 * through the door can quietly remove, with nothing anywhere recording that
 * they did.
 *
 * NOT CLEARABLE FROM INSIDE THE ADMIN. The sign-in log has a "forget these"
 * button, which is right for a list of visits and wrong for this: a record
 * that whoever is being recorded can erase is not a record. There is no clear
 * function here and no screen offering one — it ages out on its own and no
 * sooner. If it ever needs emptying, that is a database operation somebody
 * does deliberately from outside, which is the correct amount of friction.
 */

export const ADMIN_ACTION_KINDS = [
  "access-granted",
  "access-changed",
  "access-removed",
  "password-changed",
  "site-closed",
  "site-opened",
  "two-factor-on",
  "two-factor-off",
  "recovery-codes-new",
  "sessions-revoked",
  "signin-log-cleared",
] as const;

export type AdminActionKind = (typeof ADMIN_ACTION_KINDS)[number];

/** How each reads on the screen. Written as what happened, not as a field name. */
export const ADMIN_ACTION_WORDS: Record<AdminActionKind, string> = {
  "access-granted": "gave access to",
  "access-changed": "changed what",
  "access-removed": "took access away from",
  "password-changed": "changed the password for",
  "site-closed": "closed the site to the public",
  "site-opened": "opened the site to the public",
  "two-factor-on": "turned two-factor on for",
  "two-factor-off": "turned two-factor OFF for",
  "recovery-codes-new": "issued new recovery codes for",
  "sessions-revoked": "signed everybody out",
  "signin-log-cleared": "cleared the sign-in log",
};

/**
 * The ones worth noticing rather than merely recording.
 *
 * Turning a second factor off, taking somebody's access away, changing a
 * password, closing the site: each is either the right thing done on purpose
 * or the first thing somebody does who should not be there. The screen leads
 * with them rather than making a person read the whole list to find one.
 */
export const WEIGHTY_KINDS: readonly AdminActionKind[] = [
  "two-factor-off",
  "access-granted",
  "access-removed",
  "password-changed",
  "site-closed",
  "sessions-revoked",
  "signin-log-cleared",
];

export function isWeighty(kind: AdminActionKind): boolean {
  return WEIGHTY_KINDS.includes(kind);
}

/**
 * Who did it.
 *
 * `email` when they were signed in as themselves. The shared password carries
 * no name by nature — it is the same secret for everybody who has ever held it
 * — and is recorded as exactly that rather than left blank, because a blank
 * reads as "unknown" when the truth is "known, and it is nobody in particular".
 */
export type AdminActor = { how: "account"; email: string } | { how: "shared" };

export type AdminAction = {
  at: string;
  actor: AdminActor;
  kind: AdminActionKind;
  /** What it was done to, where that has a name — an email, "the site password". */
  subject?: string;
  /** Anything else worth a few words. Never a secret, never a password. */
  detail?: string;
  country?: string;
  city?: string;
  /** The address with its last part removed, as the sign-in log keeps it. */
  ip?: string;
};

/** How long a line is kept, and how many. Matches the change log's own shape. */
export const KEEP_DAYS = 180;
export const KEEP_COUNT = 500;

export function describeActor(actor: AdminActor): string {
  return actor.how === "account" ? actor.email : "Somebody with the shared password";
}

/** One line, as a person would read it. */
export function describeAction(action: AdminAction): string {
  const words = ADMIN_ACTION_WORDS[action.kind];
  const subject = action.subject ? ` ${action.subject}` : "";
  return `${describeActor(action.actor)} ${words}${subject}.`;
}

/** Anything older than KEEP_DAYS is not shown, whatever is still stored. */
export function stillLogged(rows: readonly AdminAction[], now: number): AdminAction[] {
  const cutoff = now - KEEP_DAYS * 86_400_000;
  return rows.filter((row) => {
    const at = Date.parse(row.at);
    return Number.isFinite(at) && at >= cutoff;
  });
}
