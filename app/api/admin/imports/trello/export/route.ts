import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { getTrelloCandidateReviewCandidates } from "@/lib/trello-candidate-review-candidates";
import { buildTrelloCandidateReviewExport } from "@/lib/trello-candidate-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An admin-only offline payload. It intentionally holds only the narrow card
 * fields produced by the review builder, never credentials or public content.
 */
export async function GET() {
  const { identity, areas } = await currentAdmin();
  if (!identity) return NextResponse.json({ error: "Please sign in as an administrator." }, { status: 401 });
  if (!mayUse(areas, "directory")) return NextResponse.json({ error: "Your sign-in does not cover the directory." }, { status: 403 });

  const now = new Date();
  const candidateSet = await getTrelloCandidateReviewCandidates();
  const payload = buildTrelloCandidateReviewExport(candidateSet.candidates, now.toISOString());
  const stamp = now.toISOString().replace(/[:.]/g, "-");

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="white-glove-trello-review-${stamp}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
