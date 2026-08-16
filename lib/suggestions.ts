import type { EditSuggestion, SuggestionStatus } from "@/lib/admin-content";

/**
 * What happens after somebody sends in a correction.
 *
 * The submission side has been complete for a while: a visitor presses
 * "Suggest an edit" on any page, writes what is wrong, and it is both emailed
 * to the owner and saved. The review side was three buttons that wrote one
 * word — approved, rejected, needs-info — and nothing else. No reason could be
 * recorded, no earlier decision survived a later one, and "needs more info"
 * never said which information was needed.
 *
 * This file is the rules, kept apart from the storage and the screen so they
 * can be tested without either. Nothing here imports the content data, so the
 * review screen can use it in the browser.
 */

export type ReviewDecision = Exclude<SuggestionStatus, "pending">;

export type ReviewInput = {
  status: ReviewDecision;
  notes: string;
  /**
   * The correction as the reviewer would actually write it.
   *
   * Approving somebody's words as-is is common; approving them after fixing a
   * typo, trimming a paragraph or translating a place name is just as common,
   * and there was nowhere to put the result. The visitor's own words are never
   * overwritten — this sits beside them.
   */
  acceptedInfo?: string;
  /**
   * Accepting a directory listing should also WRITE it. Carried on the review
   * rather than inferred, so the screen says what it is about to do.
   */
  apply?: boolean;
};

/**
 * A rejection with no reason cannot be explained to the person who wrote in,
 * and six months later it cannot be explained to yourself either. "Needs more
 * information" without a note is worse: it is a request that never says what
 * is being asked for.
 *
 * Approving needs no note. Accepting a correction says what happened.
 */
export function reviewProblem(input: { status: string; notes: string }): string | null {
  if (input.status === "approved") return null;
  if (input.status === "rejected") {
    return input.notes.trim() ? null : "Say why this is being turned down — the person who sent it can be told, and so can you in six months.";
  }
  if (input.status === "needs-info") {
    return input.notes.trim() ? null : "Say what is missing. A request for more information has to name the information.";
  }
  return "Choose approve, turn down, or ask for more.";
}

/**
 * Record a decision without losing the one before it.
 *
 * `status` and `reviewedAt` are the latest decision, which is what every
 * existing reader already expects. `history` is every decision including this
 * one, oldest first, and is only ever appended to — changing your mind about a
 * correction is a normal thing to do, and the first answer is part of the
 * record, not a mistake to be erased.
 */
export function applyReview(suggestion: EditSuggestion, input: ReviewInput, at: string): EditSuggestion {
  const notes = input.notes.trim();
  const accepted = (input.acceptedInfo ?? "").trim();
  // Only meaningful on approval, and only when it actually differs — storing a
  // copy of the visitor's own words as "what we accepted" would make every
  // approval look like it had been edited.
  const acceptedInfo = input.status === "approved" && accepted && accepted !== suggestion.suggestedInfo.trim() ? accepted : undefined;

  return {
    ...suggestion,
    status: input.status,
    reviewedAt: at,
    reviewerNotes: notes,
    acceptedInfo: acceptedInfo ?? suggestion.acceptedInfo,
    history: [...(suggestion.history ?? []), { at, status: input.status, notes, accepted: acceptedInfo }],
  };
}

/**
 * The queue, in the order somebody should work through it.
 *
 * Undecided first, and among those the oldest first: the person who wrote in
 * first has been waiting longest. Newest-first is what a feed does, and a
 * review queue is not a feed — it is a list that is supposed to reach zero.
 *
 * Everything already decided follows, most recently decided first, because
 * that is the one you are most likely to be looking for again.
 */
export function sortForReview(suggestions: EditSuggestion[]): EditSuggestion[] {
  const pending = suggestions.filter((item) => item.status === "pending");
  const decided = suggestions.filter((item) => item.status !== "pending");
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  decided.sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt));
  return [...pending, ...decided];
}

export function countByStatus(suggestions: EditSuggestion[]): Record<SuggestionStatus, number> {
  const counts: Record<SuggestionStatus, number> = { pending: 0, approved: 0, rejected: 0, "needs-info": 0 };
  for (const item of suggestions) {
    if (item.status in counts) counts[item.status] += 1;
  }
  return counts;
}

/**
 * How long a correction has been sitting there, in plain words.
 *
 * A date tells you when it arrived; this tells you how bad that is.
 */
export function waitingFor(createdAt: string, now: number): string {
  const started = new Date(createdAt).getTime();
  if (!Number.isFinite(started)) return "";
  const days = Math.floor((now - started) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "since yesterday";
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

/**
 * Which part of the admin can actually fix this.
 *
 * Approving a correction never used to lead anywhere: the decision was
 * recorded and the record it was about stayed exactly as it was, somewhere
 * else, to be found by hand. This is by target type only and needs no lookup,
 * so it works for a suggestion that arrived a second ago. The page adds a link
 * to the specific record on top of this where it can identify one.
 */
export function suggestionSection(targetType: EditSuggestion["targetType"]): { href: string; label: string } {
  switch (targetType) {
    case "directory":
      return { href: "/admin/directory/businesses", label: "Businesses" };
    case "accommodation":
      return { href: "/admin/content?tab=accommodations", label: "Accommodations" };
    case "site":
      return { href: "/admin/pages", label: "Pages" };
    case "new":
      return { href: "/admin/add", label: "Add an entry" };
    case "location":
    default:
      return { href: "/admin/directory", label: "Directory" };
  }
}

/**
 * A reply to the person who wrote in, for the owner to send.
 *
 * Deliberately a draft opened in the owner's own mail rather than something
 * the site sends by itself. Somebody who reported a wrong phone number did not
 * sign up for automated post, and a turned-down correction in particular is
 * not a message a machine should be composing on its own. The wording below is
 * a starting point to edit, and it claims nothing the reviewer has not said.
 */
export function replyDraft(suggestion: EditSuggestion): { subject: string; body: string; href: string } {
  const subject = `Your note about ${suggestion.title}`;
  const opening = `Thank you for writing in about ${suggestion.title}.`;
  const middle =
    suggestion.status === "approved"
      ? "You were right, and the site has been corrected."
      : suggestion.status === "needs-info"
        ? "Before we change it, we need a little more to go on:"
        : suggestion.status === "rejected"
          ? "We have looked into it and are leaving it as it is for now:"
          : "We are looking into it.";
  const note = suggestion.reviewerNotes?.trim();
  const body = [opening, "", middle, note ? `\n${note}` : "", "", "White Glove Kosher Travel"].filter((line) => line !== undefined).join("\n");
  const href = `mailto:${encodeURIComponent(suggestion.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, href };
}
