import { NextRequest, NextResponse } from "next/server";
import { getCemetery } from "@/data/cemeteries";
import { sendSubmissionNotification } from "@/lib/email";
import { isAllowedMediaType, putMedia, mediaStoreAvailable } from "@/lib/media";
import {
  dataUrlBytes,
  SUBMISSION_MAX_BYTES,
  SUBMISSION_REQUEST_LIMIT,
  SUBMISSION_STORED_LIMIT,
  submissionProblem,
  type PhotoSubmission,
} from "@/lib/photo-submissions";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";
import type { PhotoOwnerKind } from "@/lib/photos";

/**
 * A picture sent in by a visitor.
 *
 * ONE REQUEST, deliberately. The obvious shape would have been a public
 * version of /api/admin/media — upload first, then submit the form pointing at
 * it. That shape turns the site into free image hosting: anybody could POST an
 * arbitrary file, get back a URL that serves it, and never send the form, and
 * nothing would ever be attached to a record anybody looks at. Here the
 * picture and the form arrive together, so every stored image has a submission
 * behind it and shows up in the owner's queue.
 *
 * WHAT THIS CANNOT DO is publish anything. The row is created as a DRAFT and
 * there is no argument that changes that — publishing is a separate act by the
 * owner on the admin screen, which is the condition he set.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const who = requesterKey(request.headers);

  // The loose outer guard, so a flood of malformed bodies is not free. No real
  // person meets this one.
  const flood = await rateLimit(`photo-requests:${who}`, SUBMISSION_REQUEST_LIMIT);
  if (!flood.ok) return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Partial<PhotoSubmission> | null;
  if (!body) return NextResponse.json({ error: "Complete the form." }, { status: 400 });

  // Checked here as well as in the browser, because the browser can be skipped.
  const problem = submissionProblem(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const dataUrl = body.dataUrl!.trim();
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return NextResponse.json({ error: "Send a picture — PNG, JPG or WEBP." }, { status: 400 });
  const [, contentType] = match;
  if (!isAllowedMediaType(contentType) || contentType === "application/pdf") {
    return NextResponse.json({ error: "Send a picture — PNG, JPG or WEBP." }, { status: 400 });
  }
  if (dataUrlBytes(dataUrl) > SUBMISSION_MAX_BYTES) {
    return NextResponse.json(
      { error: `That picture is too large (max ${Math.round(SUBMISSION_MAX_BYTES / 1024)} KB). Send a smaller one.` },
      { status: 413 },
    );
  }

  if (!process.env.DATABASE_URL || !mediaStoreAvailable()) {
    return NextResponse.json({ error: "We cannot take pictures just now. Please try again later." }, { status: 503 });
  }

  // The limit that matters, counted here rather than on arrival: a complete
  // submission is about to become a file on the server, and that — not a
  // mistyped email address — is what a visitor gets five of an hour.
  const stored = await rateLimit(`photo-stored:${who}`, SUBMISSION_STORED_LIMIT);
  if (!stored.ok) {
    return NextResponse.json(
      { error: `Thank you — that is as many as we can take from one person just now. ${tooManyMessage(stored.retryAfter)}` },
      { status: 429 },
    );
  }

  const owner = await resolveOwner(body.ownerKind as PhotoOwnerKind, body.ownerRef!.trim());
  if (!owner) return NextResponse.json({ error: "We could not tell what this is a picture of." }, { status: 400 });

  const id = await putMedia(contentType, match[2]);
  if (!id) return NextResponse.json({ error: "We could not save the picture. Please try again." }, { status: 503 });

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.photo.create({
      data: {
        url: `/api/media?id=${encodeURIComponent(id)}`,
        caption: body.caption?.trim() || null,
        credit: body.credit!.trim(),
        // Not sourceUrl: nobody has checked this, and sourceUrl is where the
        // owner records a source he has looked at.
        submitterNote: body.note?.trim() || null,
        // The one status this route can produce. Nothing here may publish.
        status: "DRAFT",
        submittedAt: new Date(),
        submittedBy: body.name!.trim(),
        submittedEmail: body.email!.trim(),
        ...owner.where,
      },
    });
  } catch (error) {
    console.error("[photos] could not record a submission", error);
    return NextResponse.json({ error: "We could not save the picture. Please try again." }, { status: 503 });
  }

  // Best effort, and after the row is safely written: an email that fails must
  // not lose a picture somebody took the trouble to send.
  void sendSubmissionNotification({
    kind: "Picture",
    targetType: body.ownerKind,
    targetId: body.ownerRef,
    title: owner.title,
    name: body.name!.trim(),
    email: body.email!.trim(),
    issue: "A visitor sent in a picture. It is a draft until you confirm it.",
    currentInfo: `Credit: ${body.credit!.trim()}`,
    suggestedInfo: body.caption?.trim() || "(no caption)",
    source: body.note?.trim() || "",
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}

/**
 * What the picture is of, and what to call it in the owner's email.
 *
 * A destination and a beis hachaim arrive as slugs, because that is what a
 * public page knows about itself; a listing arrives as its id, because that is
 * what a public page knows about a listing. Each is looked up rather than
 * trusted — an id nobody can find is a submission with nowhere to go, and this
 * is the point where a stranger's input stops being a string.
 */
async function resolveOwner(
  kind: PhotoOwnerKind,
  ref: string,
): Promise<{ where: Record<string, string>; title: string } | null> {
  const { prisma } = await import("@/lib/prisma");

  if (kind === "destination") {
    const row = await prisma.destination.findUnique({ where: { slug: ref }, select: { id: true, city: true } });
    return row ? { where: { destinationId: row.id }, title: row.city } : null;
  }

  if (kind === "place") {
    const row = await prisma.practicalPlace.findUnique({ where: { id: ref }, select: { id: true, name: true } });
    return row ? { where: { placeId: row.id }, title: row.name } : null;
  }

  // A built-in beis hachaim has no row until something is saved against it, so
  // the first picture sent in for one creates it — the same as the first
  // shomer's number does.
  const existing = await prisma.cemetery.findUnique({ where: { slug: ref }, select: { id: true, name: true } });
  if (existing) return { where: { cemeteryId: existing.id }, title: existing.name };

  const builtIn = getCemetery(ref);
  if (!builtIn) return null;
  const created = await prisma.cemetery.create({
    data: {
      slug: ref,
      city: builtIn.city,
      yiddishCity: builtIn.yiddishCity,
      name: builtIn.name,
      yiddishName: builtIn.yiddishName,
      country: builtIn.country,
      status: "NEEDS_VERIFICATION",
    },
    select: { id: true, name: true },
  });
  return { where: { cemeteryId: created.id }, title: created.name };
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
