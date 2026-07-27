import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  addItineraryCollaborator,
  getCurrentAccountData,
  removeItineraryCollaborator,
} from "@/lib/account-store";
import { sendItineraryShareEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function shareUrl(request: NextRequest, shareId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || request.nextUrl.origin;
  return `${base}/i/${shareId}`;
}

async function requireAccount() {
  const cookieStore = await cookies();
  return getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
}

// Add a person (by email) to the signed-in traveler's trip, and email them the link.
export async function POST(request: NextRequest) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim();
  if (!email) return NextResponse.json({ error: "Enter an email address." }, { status: 400 });

  const result = await addItineraryCollaborator(account.email, email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Best-effort email; sharing still succeeds even if the email can't be sent.
  const url = shareUrl(request, result.shareId);
  const emailed = await sendItineraryShareEmail(email, {
    fromName: account.record.name || account.email,
    url,
    title: account.data.itinerary?.title || "Shared trip",
  });

  return NextResponse.json({ ok: true, collaborators: result.collaborators, url, emailed });
}

// Remove a person from the trip.
export async function DELETE(request: NextRequest) {
  const account = await requireAccount();
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const email = request.nextUrl.searchParams.get("email")?.trim();
  if (!email) return NextResponse.json({ error: "Which person?" }, { status: 400 });
  const result = await removeItineraryCollaborator(account.email, email);
  return NextResponse.json({ ok: true, collaborators: result.ok ? result.collaborators : [] });
}
