import { NextRequest, NextResponse } from "next/server";
import { parseViolations, recordViolations } from "@/lib/csp-reports";
import { rateLimit, requesterKey } from "@/lib/rate-limit";

/**
 * Where the browser posts "your Report-Only policy would have blocked this".
 *
 * It answers 204 to everything and never throws — a page must not be able to
 * fail because a diagnostic endpoint did. The body is parsed, reduced to
 * directive-and-host (lib/csp-reports.ts), and counted; a batch it cannot make
 * sense of is dropped, not error'd.
 *
 * RATE LIMITED, BECAUSE A REPORT SINK IS A FLOOD TARGET. One page on a slow
 * network can post dozens of reports a second, and this endpoint writes to the
 * shared store; without a ceiling a single busy visitor — or somebody pointing
 * a script at it — turns a diagnostic into a bill. The limit is generous
 * enough that real browsers reporting real violations are never turned away,
 * and the refusal, like everything here, is silent.
 */

export const dynamic = "force-dynamic";

const REPORT_LIMIT = { limit: 60, windowSeconds: 60 };

export async function POST(request: NextRequest) {
  // Counted before any work, so a flood costs a counter bump and nothing more.
  const who = requesterKey(request.headers);
  const flood = await rateLimit(`csp-report:${who}`, REPORT_LIMIT);
  if (!flood.ok) return new NextResponse(null, { status: 204 });

  const payload = await request.json().catch(() => null);
  if (payload) {
    const violations = parseViolations(payload, request.headers.get("referer") ?? "");
    if (violations.length) {
      // Not awaited into the response path beyond what the store needs: the
      // browser wants a fast 204, not a receipt.
      await recordViolations(violations, Date.now()).catch(() => undefined);
    }
  }

  return new NextResponse(null, { status: 204 });
}

// A CSP report is a POST. Anything else is a mistake, answered plainly.
export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
