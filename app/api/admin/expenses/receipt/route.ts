import { NextRequest, NextResponse } from "next/server";
import { attachReceipt, getReceipt, MAX_RECEIPT_BYTES } from "@/lib/expenses";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

// Upload a PDF receipt for an expense. Body: { id, name, dataUrl } where dataUrl
// is a "data:application/pdf;base64,..." string from the browser's FileReader.
export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { id?: string; name?: string; dataUrl?: string } | null;
  const id = (body?.id || "").trim();
  const name = (body?.name || "receipt.pdf").trim();
  const dataUrl = body?.dataUrl || "";
  if (!id) return NextResponse.json({ error: "Missing expense." }, { status: 400 });

  const match = /^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return NextResponse.json({ error: "The receipt must be a PDF file." }, { status: 400 });
  const base64 = match[1];
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: `That PDF is too large (max ${Math.round(MAX_RECEIPT_BYTES / 1024)} KB). Compress it and try again.` }, { status: 413 });
  }

  const ok = await attachReceipt(id, name, base64);
  if (!ok) return NextResponse.json({ error: "Could not save the receipt. It may be too large for the store." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

// Download / view a receipt inline. Admin-gated so receipts stay private.
export async function GET(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const receipt = await getReceipt(id);
  if (!receipt) return NextResponse.json({ error: "No receipt found." }, { status: 404 });
  const buffer = Buffer.from(receipt.data, "base64");
  const safeName = receipt.name.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": receipt.contentType || "application/pdf",
      "content-disposition": `inline; filename="${safeName}"`,
      "cache-control": "private, no-store",
    },
  });
}
