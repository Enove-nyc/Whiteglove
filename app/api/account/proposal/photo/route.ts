import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { effectiveMediaLimit, isAllowedMediaType, mediaStoreAvailable, putMedia } from "@/lib/media";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A photo for one proposal option or component, or a saved library item —
 * a hotel, a view, a tour. Shared by both: the same Business gate, the
 * same store, the same size and type limits either way.
 */
const PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_PHOTO_BYTES = effectiveMediaLimit();

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(account.email))) {
    return NextResponse.json({ error: "Building a proposal is part of a Business account." }, { status: 403 });
  }
  if (!mediaStoreAvailable()) {
    return NextResponse.json({ error: "Pictures cannot be stored just now." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { dataUrl?: string } | null;
  const match = body?.dataUrl ? /^data:([^;,]+);base64,([\s\S]+)$/.exec(body.dataUrl) : null;
  if (!match) return NextResponse.json({ error: "That file could not be read." }, { status: 400 });
  const [, contentType, base64] = match;
  if (!PHOTO_TYPES.has(contentType) || !isAllowedMediaType(contentType)) {
    return NextResponse.json({ error: "Use a PNG, JPG or WEBP picture." }, { status: 400 });
  }
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: `That picture is ${Math.round(bytes / 1024)}KB. Keep it under ${Math.round(MAX_PHOTO_BYTES / 1024)}KB.` },
      { status: 400 },
    );
  }
  const id = await putMedia(contentType, base64);
  if (!id) return NextResponse.json({ error: "That picture could not be stored. Try again." }, { status: 503 });
  return NextResponse.json({ ok: true, mediaId: id });
}
