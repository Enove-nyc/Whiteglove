import { NextResponse } from "next/server";
import { accountCookieName } from "@/lib/account-store";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accountCookieName(), "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
