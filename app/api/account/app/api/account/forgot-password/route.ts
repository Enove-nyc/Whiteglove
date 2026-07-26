import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/account-store";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  const result = await requestPasswordReset(body.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await sendPasswordResetEmail(result.email, result.resetCode);
  return NextResponse.json({ ok: true, email: result.email });
}