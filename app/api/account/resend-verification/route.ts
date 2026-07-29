import { NextRequest, NextResponse } from "next/server";
import { resendVerificationCode } from "@/lib/account-store";
import { verificationCodeTo } from "@/lib/verification-delivery";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  if (!body?.email) return NextResponse.json({ error: "Enter your email address or phone number." }, { status: 400 });
  const result = await resendVerificationCode(body.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const delivery = await verificationCodeTo(result.email, result.verificationCode);
  return NextResponse.json({
    ok: true,
    email: result.email,
    sentVia: delivery.via,
    sentTo: delivery.to,
    delivered: delivery.ok,
    deliveryError: delivery.error,
  });
}