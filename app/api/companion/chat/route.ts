import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getShareOwnerEmail } from "@/lib/account-store";
import {
  MAX_CHAT_TEXT,
  appendChat,
  chatStoreAvailable,
  readChat,
  type CompanionChatSide,
} from "@/lib/companion-chat-store";
import { identityKey } from "@/lib/identity";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

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
  const body = (await request.json().catch(() => null)) as { share?: string; text?: string } | null;
  const shareId = body?.share?.trim();
  const text = body?.text?.trim();
  if (!shareId || !text) return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  if (!chatStoreAvailable()) {
    return NextResponse.json({ error: "Messaging needs the private store connected." }, { status: 503 });
  }
  const who = await sideFor(shareId);
  if (!who) return NextResponse.json({ error: "That link is not active." }, { status: 404 });

  const messages = await appendChat(shareId, {
    from: who.side,
    text: text.slice(0, MAX_CHAT_TEXT),
    at: new Date().toISOString(),
  });
  return NextResponse.json({ messages, side: who.side });
}
