/**
 * A picture sent in by somebody who is not the owner.
 *
 * The owner's condition was explicit: he confirms before anything a stranger
 * sends appears on the site. That is not a preference — a travel site that
 * publishes an unreviewed photograph of a beis hachaim has published whatever
 * was in it, to everybody, under its own name.
 *
 * So a submission is a DRAFT and can only ever be a draft. There is no path
 * from this file to a published picture; publishing is a separate act by the
 * owner on the admin screen. `submittedAt` is what marks it as having come
 * from outside, so the owner is never looking at a stranger's picture thinking
 * it is one of his own unfinished ones.
 *
 * Nothing here touches the database or the network, so the rules can be tested
 * on their own — which matters, because they are the rules that decide whether
 * somebody else's photograph ends up on a commercial page.
 */

import { PHOTO_OWNER_KINDS, type PhotoOwnerKind } from "@/lib/photos";

/**
 * The most a visitor may send in one go.
 *
 * Below the 900 KB the media store caps at, on purpose: that cap is about what
 * Upstash will accept, and this is about what a stranger may push through a
 * public endpoint. A phone photograph is comfortably under it.
 */
export const SUBMISSION_MAX_BYTES = 600 * 1024;

/**
 * Two limits, because they are guarding two different things.
 *
 * STORED is the one that matters: how many pictures one address may actually
 * put on the server in an hour. It is counted only once a submission is
 * complete and about to be stored — deliberately, because a single limit
 * counted on arrival punishes the wrong person. Somebody who mistypes their
 * email four times would be locked out for an hour without ever having sent a
 * picture, while a script sending nothing but junk would look identical to
 * them.
 *
 * REQUESTS is the cheap outer guard, loose enough that no real person meets
 * it, there only so a flood of malformed bodies cannot be free.
 */
export const SUBMISSION_STORED_LIMIT = { limit: 5, windowSeconds: 3600 };
export const SUBMISSION_REQUEST_LIMIT = { limit: 60, windowSeconds: 3600 };

export type PhotoSubmission = {
  ownerKind: string;
  /** A destination slug, a cemetery slug, or a listing id. */
  ownerRef: string;
  name: string;
  email: string;
  /** Whose photograph it is. Required — see below. */
  credit: string;
  caption: string;
  note: string;
  /** They have said they took it, or may share it. Required. */
  permission: boolean;
  /** "data:image/png;base64,…" */
  dataUrl: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The first thing wrong with a submission, or null.
 *
 * One at a time, and in the order somebody filled the form in, so the message
 * is about the box they are looking at rather than a list of everything.
 *
 * CREDIT AND PERMISSION ARE BOTH REQUIRED, and they are not the same question.
 * The credit is whose photograph it is; the permission is whether this person
 * may hand it over. Somebody can honestly name a photographer and still have
 * no right to send the picture — that is most of how a photograph ends up
 * published without permission, and asking only one of the two would let it
 * through while looking careful.
 */
export function submissionProblem(input: Partial<PhotoSubmission>): string | null {
  if (!input.ownerRef?.trim() || !isOwnerKind(input.ownerKind)) return "We could not tell what this is a picture of.";
  if (!input.name?.trim()) return "Please give your name, so we know who sent it.";
  if (!EMAIL.test((input.email ?? "").trim())) return "Please give an email address we can reply to.";
  if (!input.dataUrl?.trim()) return "Choose a picture to send.";
  if (!input.credit?.trim()) return "Please say who took the picture. We cannot publish one without it.";
  if (!input.permission) return "Please confirm you took this picture, or that you may share it.";
  return null;
}

function isOwnerKind(value: string | undefined): value is PhotoOwnerKind {
  return typeof value === "string" && (PHOTO_OWNER_KINDS as readonly string[]).includes(value);
}

/**
 * Whether a stored picture came from outside.
 *
 * The admin screens ask this to decide what to say about it, and they ask it
 * of both a Prisma row and a plain object, so it takes only the one field.
 */
export function isVisitorSubmission(photo: { submittedAt?: Date | string | null }): boolean {
  return Boolean(photo.submittedAt);
}

/** Who sent it, in one line, for the review screen. */
export function submitterLine(photo: {
  submittedBy?: string | null;
  submittedEmail?: string | null;
}): string {
  const name = photo.submittedBy?.trim();
  const email = photo.submittedEmail?.trim();
  if (name && email) return `${name} · ${email}`;
  return name || email || "somebody who left no name";
}

/**
 * A reply to the person who sent the picture, for the owner to send.
 *
 * The same shape as the reply to a correction, and for the same reason: a
 * person who sent a photograph of their grandfather's kever did not sign up
 * for automated post, and a refusal in particular is not a message a machine
 * should compose. This is a draft in the owner's own mail, claiming nothing he
 * has not said.
 */
export function submissionReply(
  photo: { submittedBy?: string | null; submittedEmail?: string | null; caption?: string | null },
  decision: "published" | "declined",
  reason: string,
): { subject: string; body: string; href: string } {
  const about = photo.caption?.trim() ? ` of ${photo.caption.trim()}` : "";
  const subject = `Your picture${about}`;
  const middle =
    decision === "published"
      ? "It is on the site now, with your credit under it. Thank you."
      : "We are not putting this one up:";
  const body = [
    `Thank you for sending the picture${about}.`,
    "",
    middle,
    reason.trim() ? `\n${reason.trim()}` : "",
    "",
    "White Glove Kosher Travel",
  ].join("\n");
  const to = photo.submittedEmail?.trim() ?? "";
  return { subject, body, href: `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

/**
 * The queue, in the order the owner should work through it.
 *
 * Oldest first: the person who sent a picture a week ago has been waiting a
 * week. Newest-first is what a feed does, and this is a list that is supposed
 * to reach zero.
 */
export function oldestFirst<T extends { submittedAt?: Date | string | null }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => String(a.submittedAt ?? "").localeCompare(String(b.submittedAt ?? "")));
}

/** What a picture on this page could be of, for the visitor's picker. */
export type PictureTarget = { kind: PhotoOwnerKind; ref: string; label: string };

/**
 * The choices a town's page offers.
 *
 * The town itself first, then each listing on it. Offering the listings is the
 * difference between "a picture of Kraków" and "a picture of the dining room
 * at this hotel", and the second is the one somebody choosing where to stay
 * wants. A page with no listings simply offers the town, and the form shows no
 * picker at all.
 */
export function townPictureTargets(
  town: { slug: string; city: string },
  places: Array<{ id: string; name: string }>,
): PictureTarget[] {
  return [
    { kind: "destination", ref: town.slug, label: `${town.city} — the town itself` },
    ...places.map((place) => ({ kind: "place" as const, ref: place.id, label: place.name })),
  ];
}

/**
 * How big the picture actually is, from its data URL.
 *
 * Base64 is four characters per three bytes, less any padding. Checked before
 * anything is stored, because the point of a size limit is not to find out
 * afterwards.
 */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
