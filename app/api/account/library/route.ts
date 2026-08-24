import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  accountCookieName,
  deleteLibraryItem,
  deleteLibraryPack,
  getCurrentAccountData,
  getLibrary,
  resolveBusinessOwner,
  saveLibraryItem,
  saveLibraryPack,
} from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { sameOrigin } from "@/lib/secure-access";
import type { LibraryItem, LibraryPack } from "@/data/library";

export const dynamic = "force-dynamic";

/**
 * A planner's own content library — hotels, activities, tours, contacts,
 * and the destination packs built from them.
 *
 * BUSINESS ONLY, the same gate as a proposal — this exists to speed up
 * building something for a client, which is exactly what that entitlement
 * already means. Nothing here is ever reached by a client's own link;
 * it's the planner's private working set.
 */

/** The business a staff login is linked to, or the account itself. */
async function signedInEmail() {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  return account?.email ? resolveBusinessOwner(account.email) : null;
}

export async function GET() {
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const library = await getLibrary(email);
  return NextResponse.json(library);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await signedInEmail();
  if (!email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(email))) {
    return NextResponse.json({ error: "A content library is part of a Business account." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: string; id?: string; item?: LibraryItem; pack?: LibraryPack }
    | null;

  switch (body?.action) {
    case "save-item": {
      if (!body.item) return NextResponse.json({ ok: false, error: "Nothing to save." }, { status: 400 });
      const ok = await saveLibraryItem(email, body.item);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not save that." }, { status: 503 });
      return NextResponse.json({ ok: true, ...(await getLibrary(email)) });
    }
    case "delete-item": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Which one?" }, { status: 400 });
      const ok = await deleteLibraryItem(email, body.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not remove that." }, { status: 503 });
      return NextResponse.json({ ok: true, ...(await getLibrary(email)) });
    }
    case "save-pack": {
      if (!body.pack) return NextResponse.json({ ok: false, error: "Nothing to save." }, { status: 400 });
      const ok = await saveLibraryPack(email, body.pack);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not save that." }, { status: 503 });
      return NextResponse.json({ ok: true, ...(await getLibrary(email)) });
    }
    case "delete-pack": {
      if (!body.id) return NextResponse.json({ ok: false, error: "Which one?" }, { status: 400 });
      const ok = await deleteLibraryPack(email, body.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Could not remove that." }, { status: 503 });
      return NextResponse.json({ ok: true, ...(await getLibrary(email)) });
    }
    default:
      return NextResponse.json({ ok: false, error: "Say what to do with the library." }, { status: 400 });
  }
}
