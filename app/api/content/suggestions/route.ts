import { NextRequest, NextResponse } from "next/server";
import { addSuggestion } from "@/lib/admin-content";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    targetType?: "location" | "accommodation" | "site" | "directory";
    targetId?: string;
    title?: string;
    name?: string;
    email?: string;
    issue?: string;
    currentInfo?: string;
    suggestedInfo?: string;
    source?: string;
  } | null;
  if (!body?.targetType || !body.targetId || !body.title || !body.name || !body.email || !body.issue || !body.suggestedInfo) {
    return NextResponse.json({ error: "Complete the suggestion form." }, { status: 400 });
  }
  const saved = await addSuggestion({
    targetType: body.targetType,
    targetId: body.targetId,
    title: body.title,
    name: body.name,
    email: body.email,
    issue: body.issue,
    currentInfo: body.currentInfo ?? "",
    suggestedInfo: body.suggestedInfo,
    source: body.source ?? "",
  });
  if (!saved) return NextResponse.json({ error: "Connect the private database before submitting suggestions." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
