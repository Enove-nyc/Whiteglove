import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  clearAssistantConversation,
  getAssistantConversation,
  getCurrentAccountData,
  saveAssistantConversation,
} from "@/lib/account-store";
import { keepsAssistantHistory } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { readConversation, withTurns, type AssistantTurn } from "@/lib/assistant-conversation";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * The assistant conversation of whoever is signed in.
 *
 * SIGNED OUT IS NOT AN ERROR HERE. The panel asks for a conversation on open,
 * and most people opening it are not signed in; that is a normal state of the
 * world, so it answers with an empty thread and a flag rather than a 401 the
 * page would have to translate. Nothing is stored for them anywhere — not
 * here, not in their browser — and the panel says so.
 *
 * KEEPING IT IS A PRO FEATURE; ASKING IS NOT. A traveler on the free plan gets
 * exactly the same answers, drawn from exactly the same pages. What Pro buys
 * is that the thread is still there tomorrow. So the gate is on the storing
 * and never on the answering, and this route is the only place it is applied
 * to a conversation — see keepsAssistantHistory in lib/account-limits.ts.
 */
async function currentEmail(): Promise<string | null> {
  const store = await cookies();
  const account = await getCurrentAccountData(store.get(accountCookieName())?.value);
  return account?.email ?? null;
}

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ signedIn: false, kept: false, turns: [] });
  const kept = keepsAssistantHistory(await getPlan(email));
  // A plan that does not keep history is not shown a thread from a plan it
  // used to be on. Nothing is deleted — an account that upgrades again finds
  // its conversation where it left it.
  if (!kept) return NextResponse.json({ signedIn: true, kept: false, turns: [] });
  const conversation = readConversation(await getAssistantConversation(email));
  return NextResponse.json({ signedIn: true, kept: true, turns: conversation.turns });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await currentEmail();
  // Not signed in: the conversation happened, and it is not kept. Answering
  // ok rather than refusing keeps the panel's code the same either way.
  if (!email) return NextResponse.json({ signedIn: false, kept: false, saved: false });
  if (!keepsAssistantHistory(await getPlan(email))) {
    return NextResponse.json({ signedIn: true, kept: false, saved: false });
  }

  const body = (await request.json().catch(() => null)) as { turns?: unknown } | null;
  // Read through the same sanitiser the stored value goes through, so a
  // posted turn cannot carry a role, a link or a length the panel would not.
  const added: AssistantTurn[] = readConversation({ turns: body?.turns }).turns;
  if (!added.length) return NextResponse.json({ signedIn: true, kept: true, saved: false });

  const existing = readConversation(await getAssistantConversation(email));
  // STAMPED HERE, NOT IN THE BROWSER. A time from a page is whatever that
  // machine's clock says, and these are ordered by it.
  const now = new Date().toISOString();
  const saved = await saveAssistantConversation(
    email,
    withTurns(existing, added.map((turn) => ({ ...turn, at: now })), now),
  );
  return NextResponse.json({ signedIn: true, kept: true, saved });
}

/** Clearing it is one deletion, and the traveler's to make. */
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await currentEmail();
  if (!email) return NextResponse.json({ signedIn: false, cleared: false });
  return NextResponse.json({ signedIn: true, cleared: await clearAssistantConversation(email) });
}
