/**
 * What somebody you shared a trip with is allowed to do.
 *
 * Sharing was one thing: you added a person and they could look. That is right
 * for a brother-in-law you are showing the plan to, and wrong for the two
 * people who are actually building it with you — who had to send you their
 * changes and wait for you to type them in.
 *
 * Three roles now, and they are the three questions people actually have:
 *
 *   VIEWER     can read it. What everybody had before.
 *   COMMENTER  can read it and say something on it, and change nothing.
 *   EDITOR     can change it, the same as you.
 *
 * NOBODY IS PROMOTED BY THIS CHANGE. Every person already on a trip becomes a
 * VIEWER, because that is exactly what they could do yesterday. Adding roles
 * must not be the reason somebody's cousin can suddenly rewrite the flights.
 *
 * THE OWNER IS NOT A ROLE. He is the account the trip is in. He cannot be
 * demoted, cannot be removed, and is not in the list — a trip whose owner can
 * be edited out of it is a trip that can be taken.
 */

export const TRIP_ROLES = ["viewer", "commenter", "editor"] as const;
export type TripRole = (typeof TRIP_ROLES)[number];

/** What somebody already on a trip gets. What they could already do. */
export const DEFAULT_ROLE: TripRole = "viewer";

export const ROLE_LABELS: Record<TripRole, string> = {
  viewer: "Can view",
  commenter: "Can comment",
  editor: "Can edit",
};

/** Said as what the person can do, not as a permission name. */
export const ROLE_BLURB: Record<TripRole, string> = {
  viewer: "They can look at the trip. They cannot change it or write on it.",
  commenter: "They can look at it and leave a note on it. They cannot change it.",
  editor: "They can change the trip — add stops, move days, edit anything you can.",
};

export type TripAction = "view" | "comment" | "edit";

const ALLOWED: Record<TripRole, TripAction[]> = {
  viewer: ["view"],
  commenter: ["view", "comment"],
  editor: ["view", "comment", "edit"],
};

export function isTripRole(value: unknown): value is TripRole {
  return typeof value === "string" && (TRIP_ROLES as readonly string[]).includes(value);
}

/**
 * One person's place on a trip.
 *
 * `person` is whatever they sign in with — an email or a phone in E.164 —
 * because somebody who signed up with a number has no address to be added by.
 */
export type Collaborator = {
  person: string;
  role: TripRole;
  addedAt?: string;
};

/**
 * Read the stored list, whatever shape it is in.
 *
 * It used to be an array of strings. Those are viewers: it is what they could
 * do, and a migration that quietly handed them the pen would be the worst kind
 * of upgrade. Anything unreadable is dropped rather than guessed at — a
 * collaborator nobody can identify is not somebody to give access to.
 */
export function readCollaborators(stored: unknown): Collaborator[] {
  if (!Array.isArray(stored)) return [];
  const out: Collaborator[] = [];
  for (const entry of stored) {
    if (typeof entry === "string") {
      if (entry.trim()) out.push({ person: entry.trim(), role: DEFAULT_ROLE });
      continue;
    }
    if (entry && typeof entry === "object") {
      const person = typeof (entry as Collaborator).person === "string" ? (entry as Collaborator).person.trim() : "";
      if (!person) continue;
      const role = (entry as Collaborator).role;
      out.push({
        person,
        // An unknown role is a viewer, not an editor. Whatever went wrong, the
        // safe end of it is the one where nobody gained anything.
        role: isTripRole(role) ? role : DEFAULT_ROLE,
        addedAt: typeof (entry as Collaborator).addedAt === "string" ? (entry as Collaborator).addedAt : undefined,
      });
    }
  }
  return out;
}

/**
 * What this person may do on this trip.
 *
 * The owner is answered first and always yes: he is the account the trip is
 * in, and no list decides that. Everybody else is looked up, and anybody not
 * on the list may do nothing — including read, because a trip is private.
 */
export function may(
  action: TripAction,
  { owner, asker, collaborators }: { owner: string; asker: string | null; collaborators: Collaborator[] },
  same: (a: string, b: string) => boolean = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase(),
): boolean {
  if (!asker) return false;
  if (same(asker, owner)) return true;
  const found = collaborators.find((c) => same(c.person, asker));
  if (!found) return false;
  return ALLOWED[found.role].includes(action);
}

/** The role somebody holds, or null when they are not on the trip. */
export function roleOf(
  asker: string | null,
  collaborators: Collaborator[],
  same: (a: string, b: string) => boolean = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase(),
): TripRole | null {
  if (!asker) return null;
  return collaborators.find((c) => same(c.person, asker))?.role ?? null;
}

/** Everything this role can do, for saying so on a screen. */
export function whatTheyCanDo(role: TripRole): TripAction[] {
  return [...ALLOWED[role]];
}

/**
 * Why this cannot be shared with this person, or null.
 *
 * The owner is the one worth checking: adding yourself reads as the site not
 * knowing whose trip it is, and there is no role that would mean anything.
 */
export function shareProblem(
  input: { owner: string; person: string; role: unknown },
  same: (a: string, b: string) => boolean = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase(),
): string | null {
  if (!input.person.trim()) return "Enter an email address or a phone number.";
  if (same(input.person, input.owner)) return "That is your own account.";
  if (!isTripRole(input.role)) return "Choose what they can do.";
  return null;
}

/**
 * Somebody's place on the trip, in a sentence.
 *
 * Shown to the person themselves when they open a trip that is not theirs, so
 * they know before they try whether the Save button is going to work.
 */
export function describeRole(role: TripRole | null, ownerName: string): string {
  if (!role) return `${ownerName} has not shared this with you.`;
  if (role === "editor") return `${ownerName} shared this with you. You can change it.`;
  if (role === "commenter") return `${ownerName} shared this with you. You can leave notes on it, but not change it.`;
  return `${ownerName} shared this with you to look at.`;
}

/**
 * The other people on a trip who should hear that it changed.
 *
 * WHY NOT EVERYBODY. Telling every collaborator about every change is how a
 * useful notification becomes something people filter. The line drawn here is
 * the one the roles already draw: somebody given a role that lets them
 * CONTRIBUTE — an editor or a commenter — is helping build this trip and wants
 * to know it moved under them. Somebody given "can view" was shown a plan;
 * they are an audience, and an audience did not ask to be told each time a
 * stop was renamed.
 *
 * The owner is never in this list. They are told separately and by name, on
 * their own trip, whether or not they contribute to it.
 *
 * And never the person who just did it: an email telling somebody what they
 * themselves have this moment done is the fastest way to teach them to ignore
 * the next one.
 */
export function othersToTell(collaborators: readonly Collaborator[], owner: string, actor: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of collaborators) {
    const person = entry.person.trim().toLowerCase();
    if (!person || person === owner.trim().toLowerCase() || person === actor.trim().toLowerCase()) continue;
    if (entry.role === "viewer") continue;
    if (seen.has(person)) continue;
    seen.add(person);
    out.push(entry.person);
  }
  return out;
}
