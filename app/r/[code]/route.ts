import { NextRequest, NextResponse } from "next/server";
import { normalizeReferralCode } from "@/lib/referral";
import { ownerForCode, readReferralSettings } from "@/lib/referral-store";

/**
 * Referral landing — sets a first-party cookie when the programme is on.
 * Disabled programme redirects home without attributing anything.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const settings = await readReferralSettings();
  const home = new URL("/", request.url);

  if (!settings.enabled) {
    return NextResponse.redirect(home);
  }

  const code = normalizeReferralCode(raw);
  if (!code) return NextResponse.redirect(home);
  const owner = await ownerForCode(code);
  if (!owner) return NextResponse.redirect(home);

  const response = NextResponse.redirect(new URL("/account", request.url));
  response.cookies.set("wg_referral", code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
