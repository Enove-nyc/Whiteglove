import { NextRequest, NextResponse } from "next/server";
import { blobMediaActive, mediaInBlobs, putMediaInBlobs } from "@/lib/media";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * Copy the uploaded files from an old host into this host's file store (Netlify
 * Blobs or Cloudflare R2) — the one-off moves of 18 November 2026. Each Railway service kept its own disk, so
 * there are two sources. The admin screen calls this repeatedly, a small batch
 * each time (a Netlify function has seconds, not minutes), until both report
 * done. Safe to run again: a file already copied is skipped.
 */
const SOURCES: Record<string, string> = {
  kosher: "https://whiteglove-production.up.railway.app",
  itineraries: "https://luminous-liberation-production-82fd.up.railway.app",
  // Anything uploaded while the site ran on Netlify (from 18 November 2026),
  // for the move on to Cloudflare. Its own address, so it never copies from itself.
  netlify: "https://whiteglove-0yqk.netlify.app",
};

const BATCH = 12;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return NextResponse.json({ error: "Sign in to the admin first." }, { status: 401 });
  }
  if (!blobMediaActive()) return NextResponse.json({ error: "This host has no file store for uploads." }, { status: 400 });
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set on this host." }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { source?: string; after?: string } | null;
  const origin = body?.source ? SOURCES[body.source] : undefined;
  if (!origin) return NextResponse.json({ error: "Unknown source." }, { status: 400 });

  const list = await fetch(`${origin}/api/cron/media-list?after=${encodeURIComponent(body?.after ?? "")}`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: "no-store",
  }).catch(() => null);
  if (!list?.ok) {
    return NextResponse.json({ error: `The old host did not list its files (${list?.status ?? "no answer"}).` }, { status: 502 });
  }
  const { ids } = (await list.json()) as { ids: string[] };
  const batch = ids.slice(0, BATCH);

  let copied = 0;
  let skipped = 0;
  const failed: string[] = [];
  for (const id of batch) {
    if (await mediaInBlobs(id)) {
      skipped += 1;
      continue;
    }
    const file = await fetch(`${origin}/api/media?id=${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    if (!file?.ok) {
      failed.push(id);
      continue;
    }
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const contentType = file.headers.get("content-type") || "application/octet-stream";
    if (await putMediaInBlobs(id, { contentType, data })) copied += 1;
    else failed.push(id);
  }

  const next = batch.length ? batch[batch.length - 1] : null;
  return NextResponse.json({ copied, skipped, failed, next, done: batch.length === 0 });
}
