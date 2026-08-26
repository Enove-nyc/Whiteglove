import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, deleteAccount, readSessionEmail } from "@/lib/account-store";

export async function POST() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const email = readSessionEmail(cookie);
  if (!email) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const result = await deleteAccount(email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(accountCookieName(), "", { maxAge: 0, path: "/" });
  return response;
}
