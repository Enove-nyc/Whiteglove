import { NextRequest, NextResponse } from "next/server";
import { isDbEnabled } from "@/lib/content-admin";
import { ensureTables, seedDatabase } from "@/lib/db-setup";
import { redact } from "@/lib/redact";
import { isValidAccessToken } from "@/lib/secure-access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time (re-runnable) setup: create tables and import data/*.ts.
export async function POST(request: NextRequest) {
  if (!isValidAccessToken("admin", request.cookies.get("white_glove_admin")?.value)) {
    return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  }
  if (!isDbEnabled()) {
    return NextResponse.json(
      { error: "Add DATABASE_URL in Vercel and redeploy before running setup." },
      { status: 400 },
    );
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const tables = await ensureTables(prisma);
    const counts = await seedDatabase(prisma);
    return NextResponse.json({ ok: true, tablesCreated: tables.created, counts });
  } catch (error) {
    console.error("[db-setup] failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? redact(error.message) : "Setup failed." },
      { status: 500 },
    );
  }
}
