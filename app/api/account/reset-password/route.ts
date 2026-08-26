import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { resetPassword } from "@/lib/account-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; code?: string; password?: string } | null;
  if (!body?.email || !body?.code || !body?.password) return NextResponse.json({ error: "Enter the code and a new password." }, { status: 400 });
  // The reset code is six digits and lives for 30 minutes, so the only thing
  // standing between a known email and a stolen account is how many codes an
  // attacker can try. Cap it the same way the sign-up code is capped — by the
  // account AND by who is asking — so a million guesses is not on the table,
  // and nobody can lock a stranger out by burning their attempts either.
  for (const key of [`reset:${body.email.toLowerCase()}`, `reset-ip:${requesterKey(request.headers)}`]) {
    const gate = await rateLimit(key, { limit: 6, windowSeconds: 15 * 60 });
    if (!gate.ok) return NextResponse.json({ error: tooManyMessage(gate.retryAfter) }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
  }
  const result = await resetPassword(body.email, body.code, body.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, email: result.email });
}
