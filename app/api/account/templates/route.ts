import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  deleteTemplate,
  getCurrentAccountData,
  getTemplates,
  renameTemplate,
  saveTripAsTemplate,
  startTripFromTemplate,
} from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ?? null;
}

export async function GET() {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const templates = await getTemplates(email);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { action?: string; id?: string; tripId?: string; name?: string; startDate?: string }
    | null;

  switch (body?.action) {
    case "save": {
      if (!body.tripId) return NextResponse.json({ ok: false, error: "Say which trip." }, { status: 400 });
      const result = await saveTripAsTemplate(email, body.tripId, body.name ?? "");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "rename": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the template." }, { status: 400 });
      const result = await renameTemplate(email, body.id, body.name ?? "");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "delete": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Name the template." }, { status: 400 });
      const result = await deleteTemplate(email, body.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    case "start": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Say which template." }, { status: 400 });
      const result = await startTripFromTemplate(email, body.id, body.name ?? "", body.startDate ?? "");
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }
    default:
      return NextResponse.json({ ok: false, error: "Say what to do with the template." }, { status: 400 });
  }
}
