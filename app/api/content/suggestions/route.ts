import { NextRequest, NextResponse } from "next/server";
import { addSuggestion } from "@/lib/admin-content";
import { sendSubmissionNotification } from "@/lib/email";

const KIND_LABEL: Record<string, string> = {
  location: "Edit suggestion",
  accommodation: "Accommodation suggestion",
  site: "Site suggestion",
  directory: "Business listing",
  new: "New entry request",
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    targetType?: "location" | "accommodation" | "site" | "directory" | "new";
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

  // Email the owner and save to the dashboard in parallel. As long as one of
  // them succeeds the submission is not lost, so a visitor's message still
  // reaches the owner even when the database is not connected.
  const [emailed, saved] = await Promise.all([
    sendSubmissionNotification({
      kind: KIND_LABEL[body.targetType] ?? "Submission",
      targetType: body.targetType,
      targetId: body.targetId,
      title: body.title,
      name: body.name,
      email: body.email,
      issue: body.issue,
      currentInfo: body.currentInfo ?? "",
      suggestedInfo: body.suggestedInfo,
      source: body.source ?? "",
    }),
    addSuggestion({
      targetType: body.targetType,
      targetId: body.targetId,
      title: body.title,
      name: body.name,
      email: body.email,
      issue: body.issue,
      currentInfo: body.currentInfo ?? "",
      suggestedInfo: body.suggestedInfo,
      source: body.source ?? "",
    }),
  ]);

  if (!emailed && !saved) {
    return NextResponse.json({ error: "We couldn't record your submission just now. Please try again shortly." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
