import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAccountRecord, getShareOwnerEmail, readSessionEmail, tripAccessFor } from "@/lib/account-store";
import { addComment, commentStoreAvailable, deleteComment, findComment, readComments, setCommentDone } from "@/lib/trip-comment-store";
import { commentProblem, mayDelete, mayResolve } from "@/lib/trip-comments";

/**
 * Notes on a shared trip.
 *
 * WHO MAY DO WHAT IS READ FROM THE OWNER'S OWN RECORD, EVERY TIME. Reading
 * needs view, writing needs comment — which a viewer does not have, and which
 * is the whole point of there being three roles rather than two.
 *
 * "NOT YOURS" AND "NOT THERE" ANSWER IDENTICALLY, so the endpoint cannot be
 * used to find out whose share links are real. Somebody who CAN see the trip
 * and cannot write on it is told so in words instead — pretending it is not
 * there would be a lie they can disprove by looking at it.
 */

type Ok = { owner: string; asker: string; canComment: boolean };

async function whoAndWhat(request: NextRequest): Promise<Ok | { error: NextResponse }> {
  const shareId = request.nextUrl.searchParams.get("share")?.trim();
  if (!shareId) return { error: NextResponse.json({ error: "Which trip?" }, { status: 400 }) };
  if (!commentStoreAvailable()) return { error: NextResponse.json({ error: "Notes are not connected yet." }, { status: 503 }) };

  const jar = await cookies();
  const asker = readSessionEmail(jar.get(accountCookieName())?.value);
  if (!asker) return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };

  const owner = await getShareOwnerEmail(shareId);
  const nowhere = NextResponse.json({ error: "That trip is not here." }, { status: 404 });
  if (!owner) return { error: nowhere };

  const access = await tripAccessFor(owner, asker);
  if (!access.canView) return { error: nowhere };
  return { owner, asker, canComment: access.canComment };
}

export async function GET(request: NextRequest) {
  const found = await whoAndWhat(request);
  if ("error" in found) return found.error;
  return NextResponse.json(
    { comments: await readComments(found.owner), canComment: found.canComment, you: found.asker },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const found = await whoAndWhat(request);
  if ("error" in found) return found.error;
  if (!found.canComment) {
    return NextResponse.json({ error: "You can look at this trip but not write on it." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { body?: string; about?: string } | null;
  const problem = commentProblem(body?.body ?? "");
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Their name at the time of writing, so the thread reads as people rather
  // than as addresses — and stays right if they rename themselves later.
  const record = await getAccountRecord(found.asker);
  const written = await addComment(found.owner, {
    author: found.asker,
    authorName: record?.name,
    body: body?.body ?? "",
    about: body?.about,
  });
  if (!written) return NextResponse.json({ error: "That could not be saved." }, { status: 503 });
  return NextResponse.json({ ok: true, comments: await readComments(found.owner) });
}

/** Mark one dealt with, or put it back. */
export async function PATCH(request: NextRequest) {
  const found = await whoAndWhat(request);
  if ("error" in found) return found.error;
  const body = (await request.json().catch(() => null)) as { id?: string; done?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "Which note?" }, { status: 400 });

  const comment = await findComment(found.owner, body.id);
  if (!comment) return NextResponse.json({ error: "That note is not here." }, { status: 404 });
  if (!mayResolve(comment, found.asker, found.owner)) {
    // Not other collaborators: marking somebody else's question answered when
    // it has not been is how a thread stops meaning anything.
    return NextResponse.json({ error: "Only the person who wrote it, or whoever the trip belongs to." }, { status: 403 });
  }

  const comments = await setCommentDone(found.owner, body.id, body.done !== false, found.asker);
  if (!comments) return NextResponse.json({ error: "That could not be saved." }, { status: 503 });
  return NextResponse.json({ ok: true, comments });
}

export async function DELETE(request: NextRequest) {
  const found = await whoAndWhat(request);
  if ("error" in found) return found.error;
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Which note?" }, { status: 400 });

  const comment = await findComment(found.owner, id);
  if (!comment) return NextResponse.json({ error: "That note is not here." }, { status: 404 });
  if (!mayDelete(comment, found.asker)) {
    // Deliberately not the owner. A trip's owner removing somebody's question
    // rather than answering it is the one thing that would stop people writing
    // them; he can mark it done, which says what actually happened.
    return NextResponse.json({ error: "Only the person who wrote it can delete it. You can mark it done." }, { status: 403 });
  }

  const comments = await deleteComment(found.owner, id);
  if (!comments) return NextResponse.json({ error: "That could not be saved." }, { status: 503 });
  return NextResponse.json({ ok: true, comments });
}
