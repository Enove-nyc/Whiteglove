import { NextRequest, NextResponse } from "next/server";
import { listReportedPlaceReviews, removePlaceReview } from "@/lib/place-review-store";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

// The reported-reviews queue: reviews readers have flagged, full author
// details included — this is the owner's screen, not the public one.
export async function GET(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const reviews = await listReportedPlaceReviews();
  return NextResponse.json({ reviews });
}

// Owner takes a review off the site. Accepts the admin page's plain form post
// (and answers it with a redirect back) as well as JSON, so the queue needs no
// client-side code.
export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });

  const isForm = /form/.test(request.headers.get("content-type") ?? "");
  const id = isForm
    ? String((await request.formData().catch(() => null))?.get("id") ?? "").trim()
    : ((await request.json().catch(() => null)) as { id?: string } | null)?.id?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "Missing review." }, { status: 400 });

  const removed = await removePlaceReview(id);
  if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: 503 });
  if (isForm) return NextResponse.redirect(new URL("/admin/ratings", request.url), 303);
  return NextResponse.json({ ok: true });
}
