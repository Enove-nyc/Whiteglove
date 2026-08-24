import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";
import { extractSmartImport } from "@/lib/smart-import";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// A confirmation PDF, reasonably sized — this is a booking confirmation, not
// a scanned book. Kept well under what either provider will accept inline.
const MAX_PDF_BYTES = 6 * 1024 * 1024;

/**
 * Smart Import: paste a confirmation, or upload the confirmation PDF, and get
 * back the flights/hotel/stop rows it describes — a PREVIEW only, never
 * written to a trip by this route. The planner reviews it in
 * components/SmartImportPanel.tsx and the itinerary builder adds only what
 * they keep, the same way any other row is added.
 *
 * Open to any signed-in account, same as /api/account/itinerary itself —
 * Smart Import speeds up building AN itinerary, which is not a Business-only
 * feature. Rate-limited rather than plan-gated, since what it actually costs
 * is a paid AI call.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const flood = await rateLimit(`smart-import:${account.email}`, { limit: 20, windowSeconds: 3600 });
  if (!flood.ok) {
    return NextResponse.json(
      { error: "Too many imports for now — try again in a bit." },
      { status: 429, headers: { "retry-after": String(Math.max(1, flood.retryAfter)) } },
    );
  }

  const body = (await request.json().catch(() => null)) as { text?: string; pdfDataUrl?: string } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const pdfDataUrl = typeof body?.pdfDataUrl === "string" ? body.pdfDataUrl : "";

  if (!text && !pdfDataUrl) {
    return NextResponse.json({ error: "Paste a confirmation, or attach a PDF, first." }, { status: 400 });
  }

  let pdfBase64: string | undefined;
  if (pdfDataUrl) {
    const match = pdfDataUrl.match(/^data:application\/pdf;base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: "That doesn't look like a PDF file." }, { status: 400 });
    pdfBase64 = match[1];
    const bytes = Math.floor((pdfBase64.length * 3) / 4);
    if (bytes > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "That PDF is too large — try a smaller file." }, { status: 413 });
    }
  }

  const result = await extractSmartImport({ text: text || undefined, pdfBase64 });
  if (result.items.length === 0 && result.warnings.length === 0) {
    return NextResponse.json({
      items: [],
      warnings: [],
      error: "Could not read a booking out of that. Try pasting the confirmation text directly.",
    });
  }
  return NextResponse.json(result);
}
