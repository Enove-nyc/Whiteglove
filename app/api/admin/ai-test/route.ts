import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken } from "@/lib/secure-access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Admin-only: confirms the AI key is configured AND makes a tiny live call so
// the owner can verify the key actually works after adding it.
export async function POST(request: NextRequest) {
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const provider = geminiKey ? "Google Gemini (free)" : anthropicKey ? "Anthropic" : null;

  if (!provider) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message: "No AI key found. Add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in your host's Environment Variables and redeploy, then test again.",
    });
  }

  const testPrompt = "Reply with just the word OK.";
  try {
    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] }) },
      );
      if (!res.ok) {
        const detail = res.status === 400 || res.status === 403 ? " The key may be wrong or restricted." : "";
        return NextResponse.json({ configured: true, provider, ok: false, message: `Gemini rejected the request (HTTP ${res.status}).${detail}` });
      }
      const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text).join("").trim();
      return NextResponse.json({ configured: true, provider, ok: true, message: "Connected! The AI assistant is working.", sample: text.slice(0, 40) });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": anthropicKey as string, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 20, messages: [{ role: "user", content: testPrompt }] }),
    });
    if (!res.ok) {
      const detail = res.status === 401 ? " The key may be wrong." : "";
      return NextResponse.json({ configured: true, provider, ok: false, message: `Anthropic rejected the request (HTTP ${res.status}).${detail}` });
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return NextResponse.json({ configured: true, provider, ok: true, message: "Connected! The AI assistant is working.", sample: text.slice(0, 40) });
  } catch {
    return NextResponse.json({ configured: true, provider, ok: false, message: "Could not reach the AI service. Check the key and try again." });
  }
}
