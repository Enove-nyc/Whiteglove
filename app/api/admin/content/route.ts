import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";
import { getAdminContent, saveSiteSettings, upsertAccommodation, upsertLocation, upsertLocations, upsertPromotion, updateSuggestionStatus } from "@/lib/admin-content";

function isAdmin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  return NextResponse.json(await getAdminContent());
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  const body = await request.json().catch(() => null) as { kind?: string; data?: unknown } | null;
  if (!body?.kind) return NextResponse.json({ error: "Choose what to update." }, { status: 400 });

  if (body.kind === "settings") {
    const saved = await saveSiteSettings((body.data as Record<string, string>) ?? {});
    if (!saved) return NextResponse.json({ error: "Connect the private database before editing site settings." }, { status: 503 });
  } else if (body.kind === "location") {
    const saved = await upsertLocation(body.data as Parameters<typeof upsertLocation>[0]);
    if (!saved) return NextResponse.json({ error: "Connect the private database before editing locations." }, { status: 503 });
  } else if (body.kind === "accommodation") {
    const saved = await upsertAccommodation(body.data as Parameters<typeof upsertAccommodation>[0]);
    if (!saved) return NextResponse.json({ error: "Connect the private database before editing accommodations." }, { status: 503 });
  } else if (body.kind === "locations-bulk") {
    const saved = await upsertLocations(body.data as Parameters<typeof upsertLocations>[0]);
    if (!saved) return NextResponse.json({ error: "Connect the private database before importing locations." }, { status: 503 });
  } else if (body.kind === "suggestion") {
    const payload = body.data as { id?: string; status?: "pending" | "approved" | "rejected" | "needs-info"; reviewerNotes?: string };
    if (!payload?.id || !payload.status) return NextResponse.json({ error: "Choose a suggestion status." }, { status: 400 });
    const saved = await updateSuggestionStatus(payload.id, payload.status, payload.reviewerNotes ?? "");
    if (!saved) return NextResponse.json({ error: "Connect the private database before editing suggestions." }, { status: 503 });
  } else if (body.kind === "promotion") {
    const saved = await upsertPromotion(body.data as Parameters<typeof upsertPromotion>[0]);
    if (!saved) return NextResponse.json({ error: "Connect the private database before editing promotions." }, { status: 503 });
  } else {
    return NextResponse.json({ error: "Unsupported update type." }, { status: 400 });
  }

  return NextResponse.json(await getAdminContent());
}
