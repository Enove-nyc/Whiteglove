import { NextResponse } from "next/server";
import { partnerLiveCapabilities } from "@/lib/partner-live";

export const dynamic = "force-dynamic";

/** Which /book desks can show live options. Never returns secrets. */
export async function GET() {
  return NextResponse.json(partnerLiveCapabilities(), {
    headers: { "Cache-Control": "no-store" },
  });
}
