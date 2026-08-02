import { NextResponse } from "next/server";
import { readAirportEdits } from "@/lib/airport-store";

/**
 * The airports and city groups the owner has added.
 *
 * ONLY THE ADDITIONS, not the whole list. The picker already carries the
 * hundred built-in ones and shows them the instant somebody types; this is the
 * handful on top. Sending all of them would mean the box could not answer
 * until a request came back.
 *
 * If it fails, the picker keeps its built-in list — which is the right way for
 * this to fail, and why it is a separate request rather than a replacement.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const edits = await readAirportEdits();
  return NextResponse.json(edits, {
    // Public, and small. A minute is long enough to spare the store on a busy
    // page and short enough that a newly added airport turns up while the
    // owner is still looking at the screen.
    headers: { "cache-control": "public, max-age=60" },
  });
}
