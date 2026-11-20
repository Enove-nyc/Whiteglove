import { cookies } from "next/headers";
import { isValidAccessToken } from "@/lib/secure-access";

/**
 * Which AI services this request may use.
 *
 * FREE GEMINI FOR EVERYBODY; THE PAID SERVICES ONLY FOR THE OWNER IN HIS ADMIN
 * (owner, 20 November 2026: "only if I use up my credit, I should be able to
 * fall back on it. But no one on the site should be able to fall back on it").
 *
 * Every AI feature tries Gemini first and used to fall back to Claude and then
 * OpenAI — paid by the call — for any visitor. Now the paid keys are handed out
 * only to a request carrying a valid admin sign-in (the same token the admin
 * gate checks). A visitor, a signed-in traveller and the inbound-email webhook
 * all get Gemini alone; when Gemini is busy or past its free daily limit, the
 * feature says so rather than spending money.
 */
export type AiKeys = { gemini?: string; anthropic?: string; openai?: string; paidAllowed: boolean };

async function adminRequest(): Promise<boolean> {
  try {
    const jar = await cookies();
    return isValidAccessToken("admin", jar.get("white_glove_admin")?.value);
  } catch {
    // No request in scope (a background job): never paid.
    return false;
  }
}

export async function aiKeys(): Promise<AiKeys> {
  const gemini = process.env.GEMINI_API_KEY?.trim() || undefined;
  const paidAllowed = await adminRequest();
  if (!paidAllowed) return { gemini, paidAllowed };
  return {
    gemini,
    anthropic: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    openai: process.env.OPENAI_API_KEY?.trim() || undefined,
    paidAllowed,
  };
}
