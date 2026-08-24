import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getAdvisorWelcome, getCurrentAccountData, getTripItinerary, removeAdvisorWelcome, resolveBusinessOwner, saveAdvisorWelcome } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { captionProblem, isWelcomeVideoType, type AdvisorWelcome } from "@/data/advisor-welcome";
import { MAX_CHAT_VIDEO_BYTES, putMedia, videoUploadsAvailable } from "@/lib/media";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ? resolveBusinessOwner(account.email) : null;
}

/**
 * A trip's welcome video — the advisor's own short hello, shown to the
 * client on the proposal. BUSINESS ONLY, the same gate as the proposal
 * itself: a video greeting exists to be sent to somebody else.
 */
export async function GET(request: NextRequest) {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const wanted = request.nextUrl.searchParams.get("trip");
  const trip = await getTripItinerary(email, !wanted || wanted === "current" ? undefined : wanted);
  if (!trip) return NextResponse.json({ error: "No trip yet." }, { status: 404 });
  const welcome = await getAdvisorWelcome(email, trip.tripId);
  return NextResponse.json({ tripId: trip.tripId, welcome });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(email))) {
    return NextResponse.json({ error: "A welcome video is part of a Business account." }, { status: 403 });
  }
  if (!videoUploadsAvailable()) {
    return NextResponse.json({ error: "Video isn't available on this deployment yet." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { tripId?: string; dataUrl?: string; caption?: string } | null;
  if (!body?.tripId) return NextResponse.json({ error: "Which trip?" }, { status: 400 });
  const trip = await getTripItinerary(email, body.tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const problem = captionProblem(body.caption);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const match = body.dataUrl ? /^data:([^;,]+);base64,([\s\S]+)$/.exec(body.dataUrl) : null;
  if (!match) return NextResponse.json({ error: "That file could not be read." }, { status: 400 });
  const [, contentType, base64] = match;
  if (!isWelcomeVideoType(contentType)) return NextResponse.json({ error: "Use an MP4, MOV or WEBM video." }, { status: 400 });
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_CHAT_VIDEO_BYTES) {
    return NextResponse.json({ error: `That video is ${Math.round(bytes / 1024 / 1024)}MB. Keep it under ${Math.round(MAX_CHAT_VIDEO_BYTES / 1024 / 1024)}MB.` }, { status: 400 });
  }

  const mediaId = await putMedia(contentType, base64);
  if (!mediaId) return NextResponse.json({ error: "That video could not be stored. Try again." }, { status: 503 });

  const welcome: AdvisorWelcome = { mediaId, contentType, caption: body.caption?.trim() || undefined, uploadedAt: new Date().toISOString() };
  const ok = await saveAdvisorWelcome(email, trip.tripId, welcome);
  if (!ok) return NextResponse.json({ error: "Could not save that video." }, { status: 503 });
  return NextResponse.json({ ok: true, welcome });
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(email))) {
    return NextResponse.json({ error: "A welcome video is part of a Business account." }, { status: 403 });
  }

  const tripId = request.nextUrl.searchParams.get("trip");
  if (!tripId) return NextResponse.json({ error: "Which trip?" }, { status: 400 });
  const trip = await getTripItinerary(email, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const ok = await removeAdvisorWelcome(email, trip.tripId);
  if (!ok) return NextResponse.json({ error: "Could not remove that video." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
