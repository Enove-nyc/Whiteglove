import { NextResponse, type NextRequest } from "next/server";
import { resolveOfferClick } from "@/lib/travelpayouts-search";
import { publicUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

/**
 * Open the live Aviasales/agency offer for a Flight Search API proposal.
 * search_id + proposal_id only — never a destination URL from the query string.
 */
export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get("sid") ?? "";
  const pid = request.nextUrl.searchParams.get("pid") ?? "";
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "127.0.0.1";
  const url = await resolveOfferClick(sid, pid, ip);
  if (!url) {
    return NextResponse.redirect(publicUrl(request, "/book"), 302);
  }
  return NextResponse.redirect(url, 302);
}
