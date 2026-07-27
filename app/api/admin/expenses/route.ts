import { NextRequest, NextResponse } from "next/server";
import { addExpense, deleteExpense, expensesAvailable, listExpenses, summarizeExpenses } from "@/lib/expenses";
import { isValidAccessToken } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

export async function GET(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const items = await listExpenses();
  return NextResponse.json({ available: expensesAvailable(), items, totals: summarizeExpenses(items) });
}

export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!expensesAvailable()) return NextResponse.json({ error: "The private store isn't connected." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as
    | { date?: string; description?: string; amount?: string | number; currency?: string; category?: string; notes?: string }
    | null;
  const description = (body?.description || "").trim();
  const amountNum = Number(body?.amount);
  if (!description) return NextResponse.json({ error: "Add a description." }, { status: 400 });
  if (!Number.isFinite(amountNum) || amountNum < 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  const saved = await addExpense({
    date: (body?.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    description: description.slice(0, 200),
    amountCents: Math.round(amountNum * 100),
    currency: (body?.currency || "USD").trim().slice(0, 6).toUpperCase(),
    category: (body?.category || "Uncategorized").trim().slice(0, 60),
    notes: (body?.notes || "").trim().slice(0, 500) || undefined,
  });
  if (!saved) return NextResponse.json({ error: "Could not save the expense." }, { status: 503 });
  return NextResponse.json({ ok: true, expense: saved });
}

export async function DELETE(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const ok = await deleteExpense(id);
  if (!ok) return NextResponse.json({ error: "Could not delete." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
