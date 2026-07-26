import { NextRequest, NextResponse } from "next/server";
import { accessToken } from "@/lib/secure-access";
import { verifyAccessPassword } from "@/lib/access-passwords";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { scope?: "admin" | "site"; password?: string } | null;
  if (!body || (body.scope !== "admin" && body.scope !== "site") || !(await verifyAccessPassword(body.scope, body.password || ""))) {
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(body.scope === "admin" ? "white_glove_admin" : "white_glove_site_access", accessToken(body.scope), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: body.scope === "admin" ? 60 * 60 * 4 : 60 * 60 * 24,
    path: "/",
  });
  return response;
}
