import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAccountRecord, readSessionEmail } from "@/lib/account-store";
import {
  REVIEW_REQUEST_LIMIT,
  REVIEW_STORED_LIMIT,
  isReviewPlaceKind,
  isReviewScore,
  reviewProblem,
  toPublicReview,
  type PlaceReviewInput,
} from "@/lib/place-reviews";
import { deletePlaceReview, listPlaceReviews, savePlaceReview } from "@/lib/place-review-store";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Public reviews of a place.
 *
 * READING IS OPEN, WRITING NEEDS AN ACCOUNT. The author's name comes off the
 * account record — never off the request, where anybody could claim to be
 * anybody — and what goes back out is initials only (lib/place-reviews.ts).
 * The session cookie also carries the "one review per person per place" rule:
 * saving twice is an edit, and only the session's own review can be deleted.
 */

async function sessionEmail(): Promise<string | null> {
  const store = await cookies();
  return readSessionEmail(store.get(accountCookieName())?.value);
}

export async function GET(request: NextRequest) {
  const placeKind = request.nextUrl.searchParams.get("placeKind") ?? "";
  const placeRef = (request.nextUrl.searchParams.get("placeRef") ?? "").trim();
  if (!isReviewPlaceKind(placeKind) || !placeRef) {
    return NextResponse.json({ error: "We could not tell which place this is about." }, { status: 400 });
  }
  const viewer = await sessionEmail();
  const reviews = await listPlaceReviews(placeKind, placeRef);
  // The one public appearance a profile picture has: beside its author's
  // published reviews (the account page's Details copy promises exactly
  // this and nothing more). Joined here at read time by author, so the
  // review rows never store a second copy of anybody's picture; the URL is
  // the existing immutable media route, keyed by an unguessable id.
  const authors = [...new Set(reviews.map((review) => review.authorEmail))];
  const avatars = new Map<string, string>();
  await Promise.all(
    authors.map(async (author) => {
      const record = await getAccountRecord(author).catch(() => null);
      if (record?.avatarMediaId) avatars.set(author, `/api/media?id=${encodeURIComponent(record.avatarMediaId)}`);
    }),
  );
  return NextResponse.json({
    reviews: reviews.map((review) => toPublicReview({ ...review, avatarUrl: avatars.get(review.authorEmail) }, viewer)),
  });
}

export async function POST(request: NextRequest) {
  const who = requesterKey(request.headers);
  const flood = await rateLimit(`review-requests:${who}`, REVIEW_REQUEST_LIMIT);
  if (!flood.ok) return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "Sign in to review." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as PlaceReviewInput | null;
  if (!body) return NextResponse.json({ error: "Complete the form." }, { status: 400 });

  const problem = reviewProblem(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (!isReviewPlaceKind(body.placeKind) || !isReviewScore(Number(body.score))) {
    return NextResponse.json({ error: "Choose a rating." }, { status: 400 });
  }

  // Keyed to the account as well as the address: signing in must not turn one
  // person into an unlimited number of them.
  const stored = await rateLimit(`review-stored:${email}`, REVIEW_STORED_LIMIT);
  if (!stored.ok) return NextResponse.json({ error: tooManyMessage(stored.retryAfter) }, { status: 429 });

  const record = await getAccountRecord(email);
  const saved = await savePlaceReview({
    placeKind: body.placeKind,
    placeRef: body.placeRef!.trim(),
    placeLabel: body.placeLabel!.trim(),
    score: Number(body.score) as 1 | 2 | 3,
    text: body.text?.trim() ?? "",
    authorEmail: email,
    authorName: record?.name?.trim() || "",
  });
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 503 });
  return NextResponse.json({ ok: true, review: toPublicReview(saved.review, email) });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await sessionEmail();
  if (!email) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { placeKind?: string; placeRef?: string } | null;
  const placeKind = body?.placeKind;
  const placeRef = body?.placeRef?.trim();
  if (!isReviewPlaceKind(placeKind) || !placeRef) {
    return NextResponse.json({ error: "We could not tell which place this is about." }, { status: 400 });
  }

  // Only ever this session's own review — the email is the cookie's, so the
  // request cannot name somebody else's.
  const deleted = await deletePlaceReview(placeKind, placeRef, email);
  if (!deleted.ok) return NextResponse.json({ error: deleted.error }, { status: 503 });
  return NextResponse.json({ ok: true });
}
