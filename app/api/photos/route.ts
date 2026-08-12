import { NextResponse } from "next/server";

/**
 * Visitor picture submissions are closed.
 *
 * The owner asked that people no longer be able to add photographs. The public
 * form was already gone from customer pages; this route is what still accepted
 * a POST. It now refuses every request.
 *
 * Admin media is a separate path: PhotoManager uploads through /api/admin/media
 * and the destination / cemetery editors. That path is unchanged — only
 * stranger submissions land here.
 */

export const dynamic = "force-dynamic";

const CLOSED = {
  error: "We are not taking pictures from visitors any more. Thank you for offering.",
};

export async function POST() {
  return NextResponse.json(CLOSED, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
