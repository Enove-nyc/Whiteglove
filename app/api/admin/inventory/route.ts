import { NextRequest, NextResponse } from "next/server";
import { inventoryStatuses, type InventoryStatus } from "@/data/page-inventory";
import { getEditableInventory, saveInventoryOverride } from "@/lib/admin-inventory";
import { isValidAccessToken } from "@/lib/secure-access";

function isAdmin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

function isInventoryStatus(value: unknown): value is InventoryStatus {
  return typeof value === "string" && inventoryStatuses.some((status) => status.value === value);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  return NextResponse.json(await getEditableInventory());
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; status?: unknown; ownerNotes?: unknown } | null;
  if (!body?.id) return NextResponse.json({ error: "Choose an inventory item to update." }, { status: 400 });
  if (body.status !== undefined && !isInventoryStatus(body.status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  if (body.ownerNotes !== undefined && typeof body.ownerNotes !== "string") return NextResponse.json({ error: "Notes must be text." }, { status: 400 });

  const saved = await saveInventoryOverride(body.id, {
    status: body.status,
    ownerNotes: body.ownerNotes,
  });
  if (!saved) return NextResponse.json({ error: "Connect the private database before editing inventory items." }, { status: 503 });
  return NextResponse.json(await getEditableInventory());
}
