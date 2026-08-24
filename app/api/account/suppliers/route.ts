import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getCurrentAccountData, listCommissionSummaries, resolveBusinessOwner } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { suppliersFromCommissions } from "@/data/supplier-directory";

export const dynamic = "force-dynamic";

/**
 * The agency's supplier directory — every supplier that's appeared on a
 * commission record, rolled up across every trip. Derived fresh from the
 * commission ledger (data/trip-commission.ts) each time, the same way
 * data/clients.ts's roster is derived fresh from trips rather than kept as
 * a second list. BUSINESS ONLY, the same door as Commissions.
 */
export async function GET() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const owner = await resolveBusinessOwner(account.email);
  if (!mayServeCompanionClients(await getPlan(owner))) {
    return NextResponse.json({ error: "The supplier directory is part of a Business account." }, { status: 403 });
  }

  const summaries = await listCommissionSummaries(owner);
  const suppliers = suppliersFromCommissions(summaries);
  return NextResponse.json({ suppliers });
}
