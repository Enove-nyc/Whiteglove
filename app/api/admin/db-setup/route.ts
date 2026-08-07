import { NextRequest, NextResponse } from "next/server";
import { isDbEnabled } from "@/lib/content-admin";
import { ensureTables, seedDatabase } from "@/lib/db-setup";
import { redact } from "@/lib/redact";
import { isValidAccessToken, sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time (re-runnable) setup: create tables and import data/*.ts.
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }
  if (!isDbEnabled()) {
    return NextResponse.json(
      { error: "Add DATABASE_URL in Vercel and redeploy before running setup." },
      { status: 400 },
    );
  }
  // TWO DIFFERENT ACTIONS, and they were one button.
  //
  // Bringing the database up to date — new tables, new columns, new kinds of
  // listing — touches no content at all and needs doing after most changes.
  // Re-importing REPLACES every built-in record from data/*.ts, and used to
  // take the owner's own additions to those records with it.
  //
  // Doing both on one press meant that fixing the schema silently deleted work.
  // `reimport` has to be asked for.
  const body = (await request.json().catch(() => null)) as { reimport?: boolean } | null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const tables = await ensureTables(prisma);
    if (!body?.reimport) {
      return NextResponse.json({ ok: true, tablesCreated: tables.created, upgradedOnly: true });
    }
    const counts = await seedDatabase(prisma);
    return NextResponse.json({
      ok: true,
      tablesCreated: tables.created,
      counts,
      // Named separately from the row counts, because it is the only number
      // here that describes something the owner LOST rather than gained.
      replacedProviders: counts.replacedProviders,
      replacedNote:
        counts.replacedProviders > 0
          ? `${counts.replacedProviders} ${counts.replacedProviders === 1 ? "business had" : "businesses had"} wording of your own, and the built-in text has replaced it. What each one said before is in Admin → History, and can be put back.`
          : "",
    });
  } catch (error) {
    console.error("[db-setup] failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? redact(error.message) : "Setup failed." },
      { status: 500 },
    );
  }
}
