import { NextRequest, NextResponse } from "next/server";
import { sendContactMessage } from "@/lib/email";
import { cardIfWanted } from "@/lib/trello-store";
import { readReason } from "@/lib/contact-reasons";
import { fileFaultIssue } from "@/lib/github-issues";
import { siteOrigin } from "@/lib/seo";

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

  // EVERY MESSAGE RAISES A CARD. Which one, and therefore whose it is, comes
  // from the reason they picked — read through readReason rather than trusted,
  // because this is a public endpoint and the body is whatever was posted.
  //
  // A fault is the only reason that is a claim about the SITE rather than
  // about the world, so it is the only one that goes to the bot and the only
  // one that opens an issue. Everything else is a person waiting on a person.
  const reason = readReason((body as { reason?: string } | null)?.reason);
  const fault = reason === "fault";
  void cardIfWanted({
    kind: fault ? "fault" : "contact",
    about: subject || name,
    siteUrl: siteOrigin()?.toString(),
  });
  if (fault) {
    // Not awaited, like the card: a visitor who reported a broken button is
    // not made to wait on GitHub, and GitHub being away must not turn their
    // report into an error page.
    void fileFaultIssue({ page: firstLine(message, /^Which page:\s*(.*)$/im), what: message, device: firstLine(message, /^Phone or computer:\s*(.*)$/im) });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Pull one of the reason's answers back out of the composed message.
 *
 * composeMessage (lib/contact-reasons.ts) puts the extra answers above what
 * was typed, as "Label: value" lines. Reading them back here rather than
 * asking the browser to send them twice keeps one shape of request and one
 * place where the message is assembled — and the form and this regex are
 * matched by tests/contact-reasons.test.ts.
 */
function firstLine(message: string, pattern: RegExp): string {
  return (pattern.exec(message)?.[1] ?? "").trim();
}
