import { updateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { DIRECTORY_PUBLIC_TAG } from "@/lib/directory";
import { deleteStoredProvider, directoryStoreAvailable, listStoredProviders, saveStoredProvider } from "@/lib/directory-store";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

export async function GET(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  return NextResponse.json({ available: directoryStoreAvailable(), providers: await listStoredProviders() });
}

export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  if (!directoryStoreAvailable()) return NextResponse.json({ error: "The private store isn't connected." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !String(body.name || "").trim()) return NextResponse.json({ error: "Add a business name." }, { status: 400 });
  const saved = await saveStoredProvider(body);
  if (!saved) return NextResponse.json({ error: "Could not save the provider." }, { status: 503 });
  updateTag(DIRECTORY_PUBLIC_TAG);
  return NextResponse.json({ ok: true, provider: saved });
}

export async function DELETE(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const ok = await deleteStoredProvider(id);
  if (!ok) return NextResponse.json({ error: "Could not delete." }, { status: 503 });
  updateTag(DIRECTORY_PUBLIC_TAG);
  return NextResponse.json({ ok: true });
}
