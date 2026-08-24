import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookieName, getAccountData, getCurrentAccountData, withTrips } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { agencyIdFor, readAgency } from "@/lib/agency-store";
import { isOwner } from "@/lib/agency";
import { tripStage } from "@/data/trip-pipeline";
import { allCrossings } from "@/lib/border-store";
import { borderCostForLegs } from "@/lib/border-legs";
import { readAssumptions } from "@/lib/planner-settings-store";
import { travelDaysFor, type TravelDay } from "@/lib/trip-travel-days";

export const dynamic = "force-dynamic";

export type AgencyTravelingRow = {
  id: string;
  name: string;
  client: string;
  /** The member whose trip this is — their own sign-in identity. */
  advisorAccount: string;
  startDate: string;
  endDate: string;
  travelDays: TravelDay[];
};

/**
 * Every client currently traveling, across the WHOLE agency — not one
 * advisor's own pipeline (app/api/account/pipeline/route.ts), which stays
 * private to each member the same as it always has.
 *
 * OWNER ONLY, on purpose. An agency "shares who you are, not your client
 * list" (app/agency/page.tsx) — that stays true for every member but the
 * one whose subscription the agency runs on. The owner asked to be able to
 * see who is traveling right now across the whole book of business; nobody
 * else on the agency gets that view, including of each other.
 */
export async function GET() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  if (!account?.email) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  if (!mayServeCompanionClients(await getPlan(account.email))) {
    return NextResponse.json({ error: "Agency is part of Advisor Pro." }, { status: 403 });
  }

  const agencyId = await agencyIdFor(account.email);
  const agency = agencyId ? await readAgency(agencyId) : null;
  if (!agency || !isOwner(agency, account.email)) {
    return NextResponse.json({ error: "Only the agency owner can see this." }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const [crossings, assume] = await Promise.all([allCrossings(), readAssumptions()]);
  const borderCost = borderCostForLegs(crossings, today, assume.borderAllowanceMins);

  const rows: AgencyTravelingRow[] = (
    await Promise.all(
      agency.members.map(async (member) => {
        const data = await getAccountData(member.account);
        const { trips } = withTrips(data);
        return trips
          .filter((t) => t.itinerary && tripStage({ proposal: t.proposal, startDate: t.itinerary?.startDate, endDate: t.itinerary?.endDate }, today) === "traveling")
          .map((t) => ({
            id: t.id,
            name: t.name,
            client: t.client?.trim() ?? "",
            advisorAccount: member.account,
            startDate: t.itinerary?.startDate ?? "",
            endDate: t.itinerary?.endDate ?? "",
            travelDays: travelDaysFor(t.itinerary!, borderCost, assume),
          }));
      }),
    )
  ).flat();

  return NextResponse.json({ rows, today });
}
