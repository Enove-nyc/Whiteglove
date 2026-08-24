import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

// Public, no session check: serves any stored media by id — an uploaded
// advertisement image or PDF, or a companion-chat photo, video or voice
// note. Deliberately unauthenticated (a client on a share link has no
// account to check), so the id is the only gate: putMedia() mints it from
// the platform CSPRNG, unguessable by construction, not merely unlisted.
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
