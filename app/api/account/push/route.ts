import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, readSessionEmail, removeAccountPushSubscription, saveAccountPushSubscription } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";
import type { PushSubscriptionRecord } from "@/data/push-subscriptions";

export const dynamic = "force-dynamic";

/**
 * A traveller's own opt-in to be told about their own trip — the Shabbos
 * clash, the loose ends before departure that /command-center already shows
 * anyone who opens it.
 *
 * THE SESSION IS THE CREDENTIAL HERE, not a share token, which is the whole
 * difference from app/api/companion/push/route.ts. A client has no account
 * and their per-trip link is all they have, so that endpoint takes one. This
 * is the person whose account it is: the subscription lands on the account
 * and covers every trip in it, so it must be proven to be theirs. No email is
 * ever read from the body — only from the signed cookie — or the endpoint
 * would let anyone subscribe their own phone to somebody else's trips, which
 * is a notification feed of where a stranger is going and when.
 *
 * See components/CommandCenterNotify.tsx for the control.
 */

function isValidSubscription(v: unknown): v is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!v || typeof v !== "object") return false;
  const s = v as { endpoint?: unknown; keys?: unknown };
  if (typeof s.endpoint !== "string" || !s.endpoint.trim()) return false;
  const keys = s.keys as { p256dh?: unknown; auth?: unknown } | undefined;
  return Boolean(keys && typeof keys.p256dh === "string" && typeof keys.auth === "string");
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "That request did not come from this site." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const email = readSessionEmail(cookieStore.get(accountCookieName())?.value);
  if (!email) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { action?: string; subscription?: unknown; endpoint?: string } | null;

  if (body?.action === "unsubscribe") {
    const endpoint = body.endpoint?.trim();
    if (!endpoint) return NextResponse.json({ ok: false, error: "Missing the subscription." }, { status: 400 });
    const ok = await removeAccountPushSubscription(email, endpoint);
    return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
  }

  const subscription = body?.subscription;
  if (!isValidSubscription(subscription)) {
    return NextResponse.json({ ok: false, error: "That does not look like a push subscription." }, { status: 400 });
  }
  const record: PushSubscriptionRecord = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    addedAt: new Date().toISOString(),
  };
  const ok = await saveAccountPushSubscription(email, record);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
