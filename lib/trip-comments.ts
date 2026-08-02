/**
 * Notes people leave on a shared trip.
 *
 * The commenter role shipped without one of these, which was the honest thing
 * to flag and not a thing to leave standing: a permission to do something that
 * cannot be done is a lie the code tells about itself.
 *
 * WHAT A COMMENT IS FOR. Somebody looking at a trip has one of two things to
 * say, and neither of them fits in an edit. "The hotel is forty minutes from
 * the shul" is a fact the planner did not have. "Can we not do Uman on the
 * Friday?" is a question. Both used to leave the site — a WhatsApp message, a
 * phone call — and come back as the owner retyping something into a form.
 *
 * ATTACHED TO A STOP WHERE THERE IS ONE. A comment about the Kraków hotel
 * belongs on the Kraków hotel, not in a list at the bottom with nine others.
 * A comment about the trip as a whole has nowhere better to be and goes there.
 *
 * DONE, NOT DELETED. A note that has been dealt with is marked as done rather
 * than removed. What somebody raised, and that it was answered, is worth more
 * than a short list — and a thread that empties itself gives nobody any way to
 * check whether their point was taken.
 *
 * PRIVATE TO THE TRIP. Only people the owner shared it with can read or write
 * one, checked on the server against his record every time. A comment is
 * somebody's opinion of somebody else's plans and belongs nowhere else.
 */

export const MAX_COMMENT = 1200;
/** Enough for a real conversation; past that it is not a comment thread. */
export const MAX_PER_TRIP = 300;

export type TripComment = {
  id: string;
  /** The account that wrote it — what they sign in with. */
  author: string;
  /** Their name at the time of writing, so the thread reads as people. */
  authorName?: string;
  body: string;
  /**
   * Which flight, stay or stop it is about.
   *
   * Absent for a comment about the whole trip. Kept as the item's own id, so
   * a stop that is renamed keeps its comments and one that is deleted takes
   * them out of the day view — see `commentsFor`.
   */
  about?: string;
  createdAt: string;
  /** Dealt with. The comment stays; it just stops being outstanding. */
  doneAt?: string;
  doneBy?: string;
};

/** Why this cannot be posted, or null. */
export function commentProblem(body: string): string | null {
  const text = body.trim();
  if (!text) return "Write something first.";
  if (text.length > MAX_COMMENT) return `Keep it under ${MAX_COMMENT} characters.`;
  return null;
}

/**
 * Who may mark this one done.
 *
 * The owner, because it is his trip, and whoever wrote it, because changing
 * your mind about your own note is not an act that needs anybody's permission.
 * Not other collaborators: marking somebody else's question answered when it
 * has not been is how a thread stops meaning anything.
 */
export function mayResolve(comment: TripComment, asker: string, owner: string): boolean {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return same(asker, owner) || same(asker, comment.author);
}

/**
 * Who may delete it.
 *
 * Only the person who wrote it. Not even the owner: a trip's owner removing
 * somebody's question rather than answering it is the one thing that would
 * make people stop writing them. He can mark it done, which says what actually
 * happened.
 */
export function mayDelete(comment: TripComment, asker: string): boolean {
  return asker.trim().toLowerCase() === comment.author.trim().toLowerCase();
}

/** Oldest first, so a thread reads as a conversation. */
export function inOrder(comments: TripComment[]): TripComment[] {
  return [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** The ones on this item, or the trip-wide ones when `about` is undefined. */
export function commentsFor(comments: TripComment[], about: string | undefined): TripComment[] {
  return inOrder(comments.filter((c) => (about === undefined ? !c.about : c.about === about)));
}

/** How many are still outstanding on this item. */
export function openCount(comments: TripComment[], about?: string): number {
  return comments.filter((c) => !c.doneAt && (about === undefined || c.about === about)).length;
}

/**
 * Comments whose stop has since been deleted.
 *
 * They are not thrown away — somebody wrote them and the point may still
 * stand — but they cannot be shown under an item that is not there. The trip
 * view lists them on their own so a question does not vanish because the stop
 * it was about was moved out.
 */
export function orphaned(comments: TripComment[], liveIds: Set<string>): TripComment[] {
  return inOrder(comments.filter((c) => c.about !== undefined && !liveIds.has(c.about)));
}

/** "Yossi" from an email, when no name was stored. Never a guess at a surname. */
export function whoWrote(comment: TripComment): string {
  if (comment.authorName?.trim()) return comment.authorName.trim();
  const [name] = comment.author.split("@");
  return name || comment.author;
}

/**
 * "2 hours ago". Takes an ISO `now`, because this is worked out on the server
 * and handed to a screen — a component may not read a clock while it renders.
 */
export function whenWritten(comment: TripComment, now: string): string {
  const then = Date.parse(comment.createdAt);
  const at = Date.parse(now);
  if (Number.isNaN(then) || Number.isNaN(at)) return "earlier";
  const minutes = Math.floor((at - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * What to say at the top of a trip about its notes.
 *
 * Says the outstanding number rather than the total, because a trip with
 * fourteen answered notes and none open has nothing needing anybody.
 */
export function describeComments(comments: TripComment[]): string {
  const open = openCount(comments);
  if (comments.length === 0) return "No notes on this trip yet.";
  if (open === 0) return `${comments.length} note${comments.length === 1 ? "" : "s"}, all dealt with.`;
  return `${open} note${open === 1 ? "" : "s"} still open.`;
}
