import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/account-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string; code?: string; password?: string } | null;
  if (!body?.email || !body?.code || !body?.password) return NextResponse.json({ error: "Enter the code and a new password." }, { status: 400 });
  const result = await resetPassword(body.email, body.code, body.password);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, email: result.email });
}