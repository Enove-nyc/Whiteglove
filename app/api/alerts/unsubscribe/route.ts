import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/email-alerts-store";
import { TEST_UNSUB_TOKEN } from "@/lib/email-blast";
import { publicUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

/**
 * Two callers, one job.
 *
 * The site's own form posts JSON. The other caller is Gmail or Outlook acting
 * on the `List-Unsubscribe-Post` header every blast carries: the mail client
 * posts to this URL by itself, with a form body of its own choosing and the
 * token only ever in the query string. Reading the token from both places is
 * what makes their one-click button actually work — and a one-click button that
 * silently does nothing is worse than not offering one, because the next thing
 * that person presses is "report spam".
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim() || request.nextUrl.searchParams.get("token") || "";
  const result = await unsubscribeByToken(token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: "You have been unsubscribed." });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";

  // The owner pressing the link in a message he sent himself. Shows the real
  // page, says plainly that it was a test, and removes nobody — rather than the
  // "not valid" error, which reads as a fault in the one part of an email that
  // has to work and taught him nothing about what a reader would get.
  if (token === TEST_UNSUB_TOKEN) {
    const url = publicUrl(request, "/alerts/unsubscribed");
    url.searchParams.set("test", "1");
    return NextResponse.redirect(url);
  }

  const result = await unsubscribeByToken(token);
  const url = publicUrl(request, "/alerts/unsubscribed");
  url.searchParams.set("ok", result.ok ? "1" : "0");
  if (result.error) url.searchParams.set("error", result.error);
  return NextResponse.redirect(url);
}
