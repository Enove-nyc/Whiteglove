import { NextRequest, NextResponse } from "next/server";
import { createAccount } from "@/lib/account-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) return NextResponse.json({ error: "Enter an email and password." }, { status: 400 });
  const result = await createAccount(body.email, body.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    email: result.email,
    verificationCode: result.verificationCode,
    verificationRequired: true,
  });
}
