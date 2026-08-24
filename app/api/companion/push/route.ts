import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription, savePushSubscription } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";
import type { PushSubscriptionRecord } from "@/data/push-subscriptions";

export const dynamic = "force-dynamic";

// A client's own opt-in to be pushed a notification about their trip — see
// components/companion/CompanionApp.tsx for the control, and
// savePushSubscription in lib/account-store.ts for where it lands. No
// account and no sign-in here: the per-trip share token IS the credential,
// the same as every other client-side action on a shared trip.

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

  const body = (await request.json().catch(() => null)) as
    | { shareId?: string; action?: string; subscription?: unknown; endpoint?: string }
    | null;
  const shareId = body?.shareId?.trim();
  if (!shareId) return NextResponse.json({ ok: false, error: "Missing the trip." }, { status: 400 });

  if (body?.action === "unsubscribe") {
    const endpoint = body.endpoint?.trim();
    if (!endpoint) return NextResponse.json({ ok: false, error: "Missing the subscription." }, { status: 400 });
    const ok = await removePushSubscription(shareId, endpoint);
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
  const ok = await savePushSubscription(shareId, record);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
