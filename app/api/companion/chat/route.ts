import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getShareOwnerEmail } from "@/lib/account-store";
import {
  MAX_CHAT_LABEL,
  MAX_CHAT_TEXT,
  appendChat,
  chatStoreAvailable,
  readChat,
  type CompanionChatSide,
} from "@/lib/companion-chat-store";
import { effectiveMediaLimit, mediaStoreAvailable, putMedia } from "@/lib/media";
import { identityKey } from "@/lib/identity";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

// A picture in a chat is a photograph, not a document — the three the phone's
// camera and gallery produce, and nothing else the media store also happens to
// accept (PDFs, GIFs).
const CHAT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * The chat on one trip, between the client on the app link and the advisor.
 *
 * WHICH SIDE YOU ARE is decided here, from who you are, never from what the
 * browser claims: the signed-in owner of the trip's share is the advisor;
 * anybody else holding the link is the client. So a client cannot post as the
 * advisor by asking to, and the owner's replies are always theirs.
 */
async function sideFor(shareId: string): Promise<{ owner: string; side: CompanionChatSide } | null> {
  const owner = await getShareOwnerEmail(shareId);
  if (!owner) return null;
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  const side: CompanionChatSide =
    account?.email && identityKey(account.email) === identityKey(owner) ? "advisor" : "client";
  return { owner, side };
}

export async function GET(request: NextRequest) {
  const shareId = request.nextUrl.searchParams.get("share")?.trim();
  if (!shareId) return NextResponse.json({ error: "Which trip?" }, { status: 400 });
  const who = await sideFor(shareId);
  if (!who) return NextResponse.json({ error: "That link is not active." }, { status: 404 });
  return NextResponse.json({ messages: await readChat(shareId), side: who.side, available: chatStoreAvailable() });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as
    | { share?: string; text?: string; dataUrl?: string; lat?: number; lng?: number; label?: string }
    | null;
  const shareId = body?.share?.trim();
  if (!shareId) return NextResponse.json({ error: "Which trip?" }, { status: 400 });
  if (!chatStoreAvailable()) {
    return NextResponse.json({ error: "Messaging needs the private store connected." }, { status: 503 });
  }
  // The link itself is the credential: who this is (advisor or client) is read
  // from it and the session, never from the body — so a picture or a place can
  // only be added to a thread by somebody who genuinely holds that trip's link.
  const who = await sideFor(shareId);
  if (!who) return NextResponse.json({ error: "That link is not active." }, { status: 404 });

  // A picture. Rate limited BEFORE the work, because this is the one message a
  // client with no account can push real bytes with — the fence matters more
  // than the feature. Same media store and ceiling as a profile photo.
  if (typeof body?.dataUrl === "string" && body.dataUrl) {
    if (!mediaStoreAvailable()) {
      return NextResponse.json({ error: "Sharing a picture needs the private store connected." }, { status: 503 });
    }
    const limited = await rateLimit(`companion-image:${shareId}`, { limit: 20, windowSeconds: 3600 });
    if (!limited.ok) {
      return NextResponse.json({ error: "That is a lot of pictures at once — try again shortly." }, { status: 429 });
    }
    const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl);
    if (!match) return NextResponse.json({ error: "Share a JPG, PNG or WEBP picture." }, { status: 400 });
    const contentType = match[1];
    const base64 = match[2];
    if (!CHAT_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Use a JPG, PNG or WEBP picture." }, { status: 400 });
    }
    const bytes = Math.floor((base64.length * 3) / 4);
    if (bytes > effectiveMediaLimit()) {
      return NextResponse.json({ error: `That picture is too large (max ${Math.round(effectiveMediaLimit() / 1024)} KB).` }, { status: 413 });
    }
    const id = await putMedia(contentType, base64);
    if (!id) return NextResponse.json({ error: "Could not save the picture." }, { status: 503 });
    const messages = await appendChat(shareId, {
      from: who.side,
      kind: "image",
      text: (body.text ?? "").trim().slice(0, MAX_CHAT_LABEL),
      mediaId: id,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ messages, side: who.side });
  }

  // A place — the sender's current spot, for "I am here, where do I go now".
  if (typeof body?.lat === "number" && typeof body?.lng === "number") {
    if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng) || Math.abs(body.lat) > 90 || Math.abs(body.lng) > 180) {
      return NextResponse.json({ error: "That location did not look right." }, { status: 400 });
    }
    const messages = await appendChat(shareId, {
      from: who.side,
      kind: "location",
      text: (body.label ?? "").trim().slice(0, MAX_CHAT_LABEL),
      lat: body.lat,
      lng: body.lng,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ messages, side: who.side });
  }

  // Words.
  const text = body?.text?.trim();
  if (!text) return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  const messages = await appendChat(shareId, {
    from: who.side,
    kind: "text",
    text: text.slice(0, MAX_CHAT_TEXT),
    at: new Date().toISOString(),
  });
  return NextResponse.json({ messages, side: who.side });
}
