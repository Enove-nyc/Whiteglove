import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, getTrips } from "@/lib/account-store";
import { readChat } from "@/lib/companion-chat-store";

export const dynamic = "force-dynamic";

/**
 * The advisor's inbox: one entry per trip they have shared, newest talk first.
 *
 * Signed-in and owner-only — this is the list of an agency's own client
 * conversations, so it is read from who the request is, never from anything
 * passed in. Each shared trip is one conversation, keyed by that trip's share
 * token; the client on the other end reaches the same thread from their link.
 */
export async function GET() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const shared = (await getTrips(account.email).catch(() => [])).filter((t) => t.shareId);
  const conversations = await Promise.all(
    shared.map(async (t) => {
      const messages = await readChat(t.shareId!);
      const last = messages[messages.length - 1];
      return {
        shareId: t.shareId!,
        name: t.name,
        client: t.client,
        count: messages.length,
        lastText: last?.text ?? "",
        lastFrom: last?.from ?? null,
        lastAt: last?.at ?? "",
      };
    }),
  );
  // Trips with talk on them first, then by name — a quiet trip should not sit
  // above one the client just wrote on.
  conversations.sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || "") || a.name.localeCompare(b.name));

  return NextResponse.json({ conversations });
}
