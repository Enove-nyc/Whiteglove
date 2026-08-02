import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { ATTACHMENT_KINDS, type AttachmentKind, attachmentProblem } from "@/lib/attachments";
import { attachmentStoreAvailable, deleteAttachmentFor, getAttachmentFor, putAttachment } from "@/lib/attachment-store";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * The traveller's own boarding passes and tickets.
 *
 * NOT /api/media. That route is public, cached for a year, and its access
 * model is "the id is unguessable" — right for a banner image, wrong for a
 * document carrying somebody's name and booking reference. Everything here is
 * answered only to the account that uploaded it.
 */
async function whoIsAsking() {
  const jar = await cookies();
  const account = await getCurrentAccountData(jar.get(accountCookieName())?.value);
  return account?.email ?? null;
}

/** Serve one file back to the person who put it there. */
export async function GET(request: NextRequest) {
  const email = await whoIsAsking();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which file?" }, { status: 400 });

  const file = await getAttachmentFor(id, email);
  // The same answer for "not there" and "not yours", so asking tells nobody
  // whether a file exists.
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const buffer = Buffer.from(file.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": file.contentType || "application/octet-stream",
      // Never cached by anything in between, and never stored on disk by a
      // shared browser. This is the opposite of the advertisement media.
      "cache-control": "private, no-store, max-age=0",
      "content-disposition": `inline; filename="${file.name.replace(/["\\\r\n]/g, "")}"`,
      "x-content-type-options": "nosniff",
      // A PDF that could run script would run it on this origin, next to the
      // traveller's session. Nothing in one of these needs to.
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "referrer-policy": "no-referrer",
    },
  });
}

/** Store a file and answer with the reference that goes into the itinerary. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await whoIsAsking();
  if (!email) {
    return NextResponse.json({ error: "Sign in to keep a boarding pass with your trip." }, { status: 401 });
  }
  if (!attachmentStoreAvailable()) {
    return NextResponse.json({ error: "This needs the private store connected before files can be kept." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; kind?: string; dataUrl?: string; note?: string; existingCount?: number }
    | null;
  if (!body) return NextResponse.json({ error: "Nothing was sent." }, { status: 400 });

  const problem = attachmentProblem({
    name: body.name,
    dataUrl: body.dataUrl,
    kind: body.kind,
    existingCount: body.existingCount,
  });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const kind = ((ATTACHMENT_KINDS as readonly string[]).includes(body.kind ?? "") ? body.kind : "other") as AttachmentKind;
  const attachment = await putAttachment({
    owner: email,
    name: body.name!,
    kind,
    dataUrl: body.dataUrl!,
    note: body.note,
  });
  if (!attachment) return NextResponse.json({ error: "Could not keep that file. Try again." }, { status: 503 });
  return NextResponse.json({ ok: true, attachment });
}

/** Throw one away. The itinerary is saved separately by the planner. */
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await whoIsAsking();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which file?" }, { status: 400 });
  const gone = await deleteAttachmentFor(id, email);
  return gone
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "That is not yours to remove." }, { status: 403 });
}
