import { NextRequest, NextResponse } from "next/server";
import { isAllowedMediaType, MAX_MEDIA_BYTES, mediaStoreAvailable, putMedia } from "@/lib/media";
import { isValidAccessToken } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

// Upload an image or PDF for an advertisement. Body: { dataUrl } where dataUrl
// is a "data:<type>;base64,..." string from the browser's FileReader. Returns
// a same-origin URL to store in the promotion's image/PDF field.
export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!mediaStoreAvailable()) return NextResponse.json({ error: "Connect the private store before uploading." }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { dataUrl?: string } | null;
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(body?.dataUrl || "");
  if (!match) return NextResponse.json({ error: "Upload an image (PNG, JPG, WEBP, GIF) or a PDF." }, { status: 400 });
  const contentType = match[1];
  const base64 = match[2];
  if (!isAllowedMediaType(contentType)) {
    return NextResponse.json({ error: "That file type isn't supported. Use an image or a PDF." }, { status: 400 });
  }
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: `That file is too large (max ${Math.round(MAX_MEDIA_BYTES / 1024)} KB). Compress it and try again.` }, { status: 413 });
  }

  const id = await putMedia(contentType, base64);
  if (!id) return NextResponse.json({ error: "Could not save the file." }, { status: 503 });
  return NextResponse.json({ ok: true, url: `/api/media?id=${encodeURIComponent(id)}`, contentType });
}
