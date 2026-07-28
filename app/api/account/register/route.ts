import { NextRequest, NextResponse } from "next/server";
import { createAccount } from "@/lib/account-store";
import { normalizeIdentity } from "@/lib/identity";
import { smsConfigured } from "@/lib/sms";
import { verificationCodeTo } from "@/lib/verification-delivery";

// Sign up with an email address or a phone number. One field takes both — a
// visitor should not have to decide which kind of person they are before they
// have typed anything.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string; name?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Enter an email address or phone number, and a password." }, { status: 400 });
  }

  // Turn a phone sign-up away before the account exists, rather than making one
  // that can never be verified because no code can reach it.
  const identity = normalizeIdentity(body.email);
  if (identity?.kind === "phone" && !smsConfigured()) {
    return NextResponse.json(
      { error: "Signing up with a phone number is not switched on yet. Please use an email address." },
      { status: 400 },
    );
  }

  const result = await createAccount(body.email, body.password, body.name);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const delivery = await verificationCodeTo(result.email, result.verificationCode);
  return NextResponse.json({
    ok: true,
    email: result.email,
    verificationRequired: true,
    // So the next screen says "check your texts" to somebody who signed up
    // with a number, rather than pointing them at an inbox they never gave us.
    sentVia: delivery.via,
    sentTo: delivery.to,
    delivered: delivery.ok,
    deliveryError: delivery.error,
  });
}
