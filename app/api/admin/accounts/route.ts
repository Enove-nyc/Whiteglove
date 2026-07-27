import { NextRequest, NextResponse } from "next/server";
import { changeAccountEmail, updateAccountProfile } from "@/lib/account-store";
import { isValidAccessToken } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

function admin(request: NextRequest) {
  return isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value);
}

// Owner edits a traveler's name, phone, and/or email. Changing the email
// re-keys the account (email is the storage key), preserving saved data.
export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { email?: string; name?: string; phone?: string; newEmail?: string }
    | null;
  const email = (body?.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing account." }, { status: 400 });

  let effectiveEmail = email;
  const requestedEmail = typeof body?.newEmail === "string" ? body.newEmail.trim().toLowerCase() : "";
  if (requestedEmail && requestedEmail !== email) {
    const moved = await changeAccountEmail(email, requestedEmail);
    if (!moved.ok) return NextResponse.json({ error: moved.error }, { status: 400 });
    effectiveEmail = moved.email;
  }

  if (body?.name !== undefined || body?.phone !== undefined) {
    const updated = await updateAccountProfile(effectiveEmail, { name: body?.name, phone: body?.phone });
    if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email: effectiveEmail });
}
