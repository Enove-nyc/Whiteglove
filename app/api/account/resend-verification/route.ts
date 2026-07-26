import { NextRequest, NextResponse } from "next/server";
import { resendVerificationCode } from "@/lib/account-store";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  const result = await resendVerificationCode(body.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await sendVerificationEmail(result.email, result.verificationCode);
  return NextResponse.json({ ok: true, email: result.email });
}