import { NextRequest, NextResponse } from "next/server";
import { buildContentExport, exportFilename } from "@/lib/content-export";
import { redactDeep } from "@/lib/redact";
import { isValidAccessToken } from "@/lib/secure-access";

// Download the whole content corpus as one JSON file.
//
// This is the answer to "where does all this actually live, and what happens to
// it if the website goes away". See lib/content-export.ts for the three stores
// and what is deliberately left out.
//
// The file holds shomer and access phone numbers, so it is admin-only and is
// sent with no-store — it must not sit in a CDN cache.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full export of every table takes longer than the default allowance.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }

  const now = new Date();
  const data = await buildContentExport(now);

  // Belt and braces. Nothing in the content tables should hold a credential,
  // but this file is the one thing designed to be copied off the server, so it
  // goes through the redactor on the way out regardless.
  const safe = redactDeep(data);

  return new NextResponse(JSON.stringify(safe, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(now)}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
