import { NextRequest, NextResponse } from "next/server";
import {
  RATING_REQUEST_LIMIT,
  RATING_STORED_LIMIT,
  SCORE_LABELS,
  isRatingKind,
  isRatingScore,
  ratingProblem,
  type ExperienceRatingInput,
} from "@/lib/experience-ratings";
import { accountCookieName, getAccountRecord, readSessionEmail } from "@/lib/account-store";
import { saveExperienceRating } from "@/lib/experience-ratings-store";
import { sendSubmissionNotification } from "@/lib/email";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";
import { siteOrigin } from "@/lib/seo";
import { cardIfWanted } from "@/lib/trello-store";

export const dynamic = "force-dynamic";

/**
 * Somebody saying how a listing or a trip went.
 *
 * SAVED FIRST, EMAILED SECOND — same rule as contact. A rating is private
 * feedback for the owner; nothing here publishes a review on a public page.
 */

export async function POST(request: NextRequest) {
  const who = requesterKey(request.headers);
  const flood = await rateLimit(`rating-requests:${who}`, RATING_REQUEST_LIMIT);
  if (!flood.ok) return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const email = readSessionEmail(request.cookies.get(accountCookieName())?.value);
  if (!email) return NextResponse.json({ error: "Sign in to rate." }, { status: 401 });
  const account = await getAccountRecord(email);

  const body = (await request.json().catch(() => null)) as Partial<ExperienceRatingInput> | null;
  if (!body) return NextResponse.json({ error: "Complete the form." }, { status: 400 });

  const named = {
    ...body,
    name: account?.name?.trim() || body.name,
    email,
  };
  const problem = ratingProblem(named);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (!isRatingKind(body.kind) || !isRatingScore(Number(body.score))) {
    return NextResponse.json({ error: "Please choose how it went." }, { status: 400 });
  }

  const stored = await rateLimit(`rating-stored:${who}`, RATING_STORED_LIMIT);
  if (!stored.ok) {
    return NextResponse.json(
      { error: `Thank you — that is as many as we can take from one person just now. ${tooManyMessage(stored.retryAfter)}` },
      { status: 429 },
    );
  }

  const fields = {
    kind: body.kind,
    ref: body.ref!.trim(),
    label: body.label!.trim(),
    score: Number(body.score) as 1 | 2 | 3,
    name: (account?.name?.trim() || body.name || email).trim(),
    email,
    note: body.note?.trim() ?? "",
  };

  const saved = await saveExperienceRating(fields);
  if (!saved) {
    const emailed = await sendSubmissionNotification({
      kind: "Experience rating",
      targetType: fields.kind,
      targetId: fields.ref,
      title: fields.label,
      name: fields.name,
      email: fields.email,
      issue: `${SCORE_LABELS[fields.score]} — ${fields.label}`,
      currentInfo: "",
      suggestedInfo: fields.note || "(no note)",
      source: "",
    });
    if (!emailed) {
      return NextResponse.json(
        { error: "We could not save that just now. Please try again shortly." },
        { status: 503 },
      );
    }
  } else {
    void sendSubmissionNotification({
      kind: "Experience rating",
      targetType: fields.kind,
      targetId: fields.ref,
      title: fields.label,
      name: fields.name,
      email: fields.email,
      issue: `${SCORE_LABELS[fields.score]} — ${fields.label}`,
      currentInfo: "",
      suggestedInfo: fields.note || "(no note)",
      source: "",
    }).catch(() => undefined);
  }

  void cardIfWanted({ kind: "rating", about: fields.label, siteUrl: siteOrigin()?.toString() });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
