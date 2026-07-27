import { NextRequest, NextResponse } from "next/server";
import { sendContactMessage } from "@/lib/email";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; phone?: string; subject?: string; message?: string }
    | null;
  const name = clean(body?.name, 120);
  const email = clean(body?.email, 200);
  const phone = clean(body?.phone, 40);
  const subject = clean(body?.subject, 160);
  const message = String(body?.message ?? "").trim().slice(0, 4000);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Please add your name, email, and a message." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const sent = await sendContactMessage({ name, email, phone: phone || undefined, subject: subject || undefined, message });
  if (!sent) {
    return NextResponse.json({ error: "We couldn't send your message just now. Please email us directly or try again shortly." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
