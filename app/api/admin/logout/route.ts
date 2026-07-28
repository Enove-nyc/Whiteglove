import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/secure-access";

// Clears the admin access cookie so /admin requires the code again.
//
// Deliberately needs no admin session: an expired one still has to be
// clearable. It does need to come from this site, so another page cannot sign
// the owner out for sport.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("white_glove_admin", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
