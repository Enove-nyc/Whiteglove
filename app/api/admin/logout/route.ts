import { NextResponse } from "next/server";

// Clears the admin access cookie so /admin requires the code again.
export async function POST() {
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
