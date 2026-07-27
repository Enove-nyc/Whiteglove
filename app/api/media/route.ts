import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

// Public: serves an uploaded advertisement image or PDF by id. Media ids are
// unguessable and only referenced by promotions the owner has published.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const media = await getMedia(id);
  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const buffer = Buffer.from(media.data, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": media.contentType || "application/octet-stream",
      // Media is immutable per id, so it can be cached hard.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
