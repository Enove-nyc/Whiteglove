import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requesterKey, tooManyMessage } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/account-store";
import { resetCodeTo } from "@/lib/verification-delivery";
import { brandFromRequestHeaders } from "@/lib/site-brand-core";

/**
 * Asking for a reset code, answered the same way every time.
 *
 * This used to say "We have no account with those details" for an address it
 * did not know, and "sent to y•••@example.com" for one it did — so anybody
 * could type addresses at it and learn which people have accounts here. On a
 * site whose visitors are identifiable by where they daven, that is a list
 * worth not handing out.
 *
 * Now the reply is identical either way: same words, same shape, same status.
 * Somebody who does have an account gets a code by email; somebody who does
 * not gets nothing, sees the same screen, and finds that no code works.
 *
 * WHAT THIS COSTS. A mistyped address no longer gets told it was mistyped —
 * it looks exactly like a successful request. That is the trade, and it is
 * the one the owner chose: a typo and an address we do not know should not be
 * told apart, because telling them apart is the whole leak.
 *
 * The rate limit stays, because the reply timing is a second channel: a real
 * account does more work (writing a code, sending mail) than an unknown one.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  // The only thing still worth refusing: an empty box. That says nothing about
  // who has an account, because they have not named anybody.
  if (!body?.email) return NextResponse.json({ error: "Enter your email address or phone number." }, { status: 400 });

  for (const key of [`forgot:${body.email.toLowerCase()}`, `forgot-ip:${requesterKey(request.headers)}`]) {
    const gate = await rateLimit(key, { limit: 3, windowSeconds: 15 * 60 });
    if (!gate.ok) return NextResponse.json({ error: tooManyMessage(gate.retryAfter) }, { status: 429, headers: { "Retry-After": String(gate.retryAfter) } });
  }

  const result = await requestPasswordReset(body.email);
  if (result.ok) {
    await resetCodeTo(result.email, result.resetCode, brandFromRequestHeaders(request.headers));
  }

  // Deliberately carries nothing the caller did not already supply. No
  // address, no masked destination, no channel, no delivery status — each of
  // those would answer the question this endpoint refuses to answer.
  return NextResponse.json({
    ok: true,
    message: "If that account exists, a reset code is on its way. It expires in 30 minutes.",
  });
}
