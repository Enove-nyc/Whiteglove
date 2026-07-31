import { NextRequest, NextResponse } from "next/server";
import { ADMIN_WHO_COOKIE } from "@/lib/admin-session";
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
  const cleared = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  response.cookies.set("white_glove_admin", "", cleared);
  // And the name. Leaving it behind would let the next person to use the
  // shared password inherit the last named administrator in the log.
  response.cookies.set(ADMIN_WHO_COOKIE, "", cleared);
  return response;
}
