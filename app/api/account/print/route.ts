import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { decidePrint, limitsFor } from "@/lib/account-limits";
import { getLimitOverrides, getPrints, recordPrint } from "@/lib/account-limits-store";
import { getPlan } from "@/lib/account-plan-store";
import { accountCookieName, getCurrentAccountData, getTripItinerary } from "@/lib/account-store";

export const dynamic = "force-dynamic";

/**
 * Claiming a printable copy.
 *
 * THE PRINT PAGE ASKS BEFORE IT DRAWS. Doing it the other way round — render
 * the document, then hide it behind a message — puts the whole itinerary in the
 * page for anybody who opens the inspector, which is not a limit, it is a
 * curtain.
 *
 * NOT SIGNED IN IS NOT REFUSED. Somebody printing from their own browser, with
 * no account, has nothing this could count and no account to count it against.
 * They were never the ones this is for.
 *
 * IT FAILS OPEN, EVERYWHERE. Cannot read the plan, cannot read the log, cannot
 * write the log — the copy is allowed. A traveller standing at a printer being
 * told no because a store blinked is a worse failure than one extra copy on a
 * free account, and it is indistinguishable from the site being broken.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const account = await getCurrentAccountData(cookieStore.get(accountCookieName())?.value);
  if (!account) return NextResponse.json({ allowed: true, counted: false, message: "" });

  const body = (await request.json().catch(() => null)) as { tripId?: string } | null;

  try {
    // The trip actually open, unless the page named one. Falling back to a
    // constant would make every trip look like the same trip, and the grace
    // window would then let one allowance print all of them.
    const tripId =
      body?.tripId?.trim() || (await getTripItinerary(account.email).then((t) => t?.tripId ?? "")) || "the open trip";

    const plan = await getPlan(account.email);
    const limits = limitsFor(plan, await getLimitOverrides());
    const prints = await getPrints(account.email);
    const now = Date.now();

    const decision = decidePrint({ plan, limits, prints, tripId, now });
    if (!decision.allowed) {
      return NextResponse.json(
        { allowed: false, message: decision.message, nextAt: decision.nextAt },
        // 200, not 403. This is an answer to a question, not a rejected
        // request, and the page shows the message rather than an error.
        { status: 200 },
      );
    }
    if (decision.counted) await recordPrint(account.email, { tripId, at: new Date(now).toISOString() });
    return NextResponse.json({ allowed: true, counted: decision.counted, message: decision.message });
  } catch {
    return NextResponse.json({ allowed: true, counted: false, message: "" });
  }
}
