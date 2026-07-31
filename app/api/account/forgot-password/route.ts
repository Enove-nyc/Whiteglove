import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/account-store";
import { resetCodeTo } from "@/lib/verification-delivery";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  if (!body?.email) return NextResponse.json({ error: "Enter your email address or phone number." }, { status: 400 });
  // Also the main brake on account enumeration: without it, this endpoint
  // answers "does this person have an account here?" as fast as you can ask.
  for (const key of [`forgot:${body.email.toLowerCase()}`, `forgot-ip:${requesterKey(request.headers)}`]) {
    const gate = await rateLimit(key, { limit: 3, windowSeconds: 15 * 60 });
    if (!gate.ok) return NextResponse.json({ error: tooManyMessage(gate.retryAfter) }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
  }
  const result = await requestPasswordReset(body.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const delivery = await resetCodeTo(result.email, result.resetCode);
  return NextResponse.json({
    ok: true,
    email: result.email,
    sentVia: delivery.via,
    sentTo: delivery.to,
    delivered: delivery.ok,
    deliveryError: delivery.error,
  });
}