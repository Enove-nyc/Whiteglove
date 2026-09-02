import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { usableHref, type RecentPlace } from "@/data/recent-places";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { sameOrigin } from "@/lib/secure-access";
import { forgetRecentPlaces, readRecentPlaces, rememberVisit } from "@/lib/recent-places-store";

export const dynamic = "force-dynamic";

/**
 * Where somebody had got to, and the button that forgets it.
 *
 * Signed out, every one of these is a quiet no-op: nothing is recorded for
 * somebody who has not asked to be remembered, and the page that called it
 * carries on regardless.
 *
 * ONLY A PATH ON THIS SITE IS EVER STORED. usableHref refuses an absolute URL
 * or a protocol-relative one, so this list cannot be turned into a way to put
 * a link to somewhere else in front of the account holder.
 */
async function who(): Promise<string> {
  const account = await getCurrentAccountData((await cookies()).get(accountCookieName())?.value);
  return account?.email ?? "";
}

export async function GET() {
  const email = await who();
  if (!email) return NextResponse.json({ recent: [] });
  return NextResponse.json({ recent: await readRecentPlaces(email) });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const email = await who();
  // Not an error: a signed-out visitor browses exactly as before, and simply
  // is not remembered.
  if (!email) return NextResponse.json({ ok: true });

  const body = (await request.json().catch(() => null)) as
    | { action?: unknown; href?: unknown; name?: unknown; where?: unknown }
    | null;

  if (body?.action === "forget") {
    return NextResponse.json({ ok: await forgetRecentPlaces(email) });
  }

  const href = typeof body?.href === "string" ? body.href : "";
  const name = typeof body?.name === "string" ? body.name : "";
  if (!usableHref(href) || !name.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const entry: RecentPlace = {
    href,
    name,
    where: typeof body?.where === "string" ? body.where : "",
    at: new Date().toISOString(),
  };
  await rememberVisit(email, entry);
  return NextResponse.json({ ok: true });
}
