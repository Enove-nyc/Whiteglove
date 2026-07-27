import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Optional AI suggestions for filling free time. Uses ANTHROPIC_API_KEY when it
// is configured; otherwise returns { available: false } so the UI can show a
// gentle note instead of failing.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ available: false, reason: "AI suggestions are off. Add ANTHROPIC_API_KEY to enable them." });
  }
  const body = (await request.json().catch(() => null)) as
    | { location?: string; date?: string; freeHours?: number; alreadyPlanned?: string[] }
    | null;
  const location = (body?.location || "").slice(0, 200);
  if (!location) return NextResponse.json({ available: false, reason: "Missing location." });

  const planned = (body?.alreadyPlanned || []).slice(0, 12).join("; ");
  const prompt = [
    `A kosher / frum Jewish traveler is near ${location}`,
    body?.date ? ` on ${body.date}` : "",
    typeof body?.freeHours === "number" ? ` with about ${body.freeHours} free hours` : "",
    ".",
    planned ? ` They already plan to visit: ${planned}.` : "",
    " Suggest 3–5 worthwhile things to do nearby that suit a kosher / Jewish-heritage traveler",
    " — kevarim, historic Jewish sites, scenic stops, or kosher food.",
    " Keep each suggestion to one short line. Do NOT invent exact addresses, phone numbers, or hours.",
  ].join("");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      return NextResponse.json({ available: false, reason: "AI service is temporarily unavailable." });
    }
    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return NextResponse.json({ available: true, text });
  } catch {
    return NextResponse.json({ available: false, reason: "Could not reach the AI service." });
  }
}
