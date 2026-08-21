import { NextRequest, NextResponse } from "next/server";
import { getSharedForm, submitFormResponse } from "@/lib/account-store";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A traveler's own side of a pre-trip form — no account, just the link the
 * planner sent. GET returns the template only, never any answer anybody
 * else already submitted (see getSharedForm). POST is the only door a
 * respondent has, and only ever adds a response — nothing here can read,
 * change or remove one that already exists.
 */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedForm(shareId);
  if (!shared) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(shared);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const { shareId } = await params;

  const limited = await rateLimit(`client-form-submit:${shareId}`, { limit: 30, windowSeconds: 3600 });
  if (!limited.ok) return NextResponse.json({ error: "That is a lot at once — try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { respondentName?: string; answers?: Record<string, string> } | null;
  if (!body?.respondentName?.trim()) return NextResponse.json({ error: "Say whose answers these are." }, { status: 400 });
  const ok = await submitFormResponse(shareId, body.respondentName, body.answers ?? {});
  if (!ok) return NextResponse.json({ error: "That didn't go through." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
