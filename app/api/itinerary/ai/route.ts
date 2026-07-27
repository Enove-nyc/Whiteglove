import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Optional AI suggestions for filling free time. Works with a FREE Google
// Gemini key (GEMINI_API_KEY — no credit card needed) or a paid Anthropic key
// (ANTHROPIC_API_KEY). If neither is set it returns { available: false } so the
// UI shows a gentle note instead of failing.
export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    return NextResponse.json({ available: false, reason: "AI ideas are off. Add a free GEMINI_API_KEY (or an ANTHROPIC_API_KEY) to enable them." });
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
    // Prefer the free Gemini key when present.
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );
      if (!res.ok) return NextResponse.json({ available: false, reason: "AI service is temporarily unavailable." });
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text).filter(Boolean).join("\n").trim();
      return NextResponse.json({ available: true, text });
    }

    // Fall back to Anthropic if that key is the one configured.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicKey as string, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return NextResponse.json({ available: false, reason: "AI service is temporarily unavailable." });
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return NextResponse.json({ available: true, text });
  } catch {
    return NextResponse.json({ available: false, reason: "Could not reach the AI service." });
  }
}
