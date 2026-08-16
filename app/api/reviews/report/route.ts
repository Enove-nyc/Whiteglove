import { NextRequest, NextResponse } from "next/server";
import { REVIEW_REPORT_LIMIT } from "@/lib/place-reviews";
import { reportPlaceReview } from "@/lib/place-review-store";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A reader flags a review.
 *
 * NO SIGN-IN, on purpose: the person best placed to spot spam is a passer-by,
 * and a passer-by will not open an account to say so. What stands in for the
 * account is the rate limit and the fact that a report only counts — the
 * review stays up until the owner looks. Nothing here removes anything.
 */
export async function POST(request: NextRequest) {
  const who = requesterKey(request.headers);
  const flood = await rateLimit(`review-report:${who}`, REVIEW_REPORT_LIMIT);
  if (!flood.ok) return NextResponse.json({ error: tooManyMessage(flood.retryAfter) }, { status: 429 });
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "We could not tell which review you mean." }, { status: 400 });

  const reported = await reportPlaceReview(id);
  if (!reported.ok) return NextResponse.json({ error: reported.error }, { status: 503 });
  return NextResponse.json({ ok: true });
}
