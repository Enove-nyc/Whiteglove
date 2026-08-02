import { NextResponse } from "next/server";
import { readAssumptions } from "@/lib/planner-settings-store";

/**
 * The figures the planner uses, for the parts of the site that render in the
 * browser.
 *
 * Public, and nothing here is a secret: every one of these numbers is already
 * visible in the arrival times and the free-hours notice on any trip. What it
 * protects against is the opposite problem — a printed itinerary quietly using
 * different figures from the planner that produced it.
 *
 * Nothing to write here. These are changed from /admin/planner, behind the
 * admin sign-in, and a POST would be a way around it.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readAssumptions(), {
    headers: { "Cache-Control": "no-store" },
  });
}
