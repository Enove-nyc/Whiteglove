import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-current";
import { searchAdmin } from "@/lib/admin-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { identity, areas } = await currentAdmin();
  if (!identity) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("q") || "";
  const raw = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 40) : 24;
  const response = await searchAdmin(q, { areas, limit });
  return NextResponse.json(response);
}
