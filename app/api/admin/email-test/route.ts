import { NextRequest, NextResponse } from "next/server";
import { emailConfigStatus, sendTestEmail } from "@/lib/email";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

// Current email configuration (no secrets — only whether the key is set).
export async function GET(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  return NextResponse.json(await emailConfigStatus());
}

// Send a real test email to one of the owner inboxes and report the outcome.
export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { inbox?: string } | null;
  const which = body?.inbox === "edits" || body?.inbox === "contact-itineraries" ? body.inbox : "contact-kosher";
  const result = await sendTestEmail(which);
  return NextResponse.json({ ...result, config: await emailConfigStatus() });
}
