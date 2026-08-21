import { NextRequest, NextResponse } from "next/server";
import { applyProposalClientAction, getSharedProposal, type ProposalClientAction } from "@/lib/account-store";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/secure-access";

export const dynamic = "force-dynamic";

/**
 * A client's own side of a proposal — no account, no sign-in, just the link
 * the planner sent. GET marks a freshly-sent proposal "viewed" the first
 * time it's opened; POST is the only door a client has to act on it at all
 * (pick an option, approve, ask for changes, leave a comment) — the shape is
 * checked and refused server-side (lib/account-store.ts), never trusted
 * from whatever the client happened to send.
 */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedProposal(shareId);
  if (!shared) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(shared);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "That request did not come from this site." }, { status: 403 });
  }
  const { shareId } = await params;

  // A comment or a response is real activity, not a poll — worth a limit,
  // but a generous one: a family going back and forth over an option is the
  // normal case, not abuse.
  const limited = await rateLimit(`proposal-action:${shareId}`, { limit: 60, windowSeconds: 3600 });
  if (!limited.ok) return NextResponse.json({ error: "That is a lot at once — try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as
    | { kind?: string; optionId?: string; text?: string }
    | null;
  let action: ProposalClientAction | null = null;
  if (body?.kind === "select" && typeof body.optionId === "string") action = { kind: "select", optionId: body.optionId };
  else if (body?.kind === "approve") action = { kind: "approve" };
  else if (body?.kind === "request_changes") action = { kind: "request_changes", text: body.text };
  else if (body?.kind === "comment" && typeof body.text === "string") action = { kind: "comment", text: body.text };
  if (!action) return NextResponse.json({ error: "Say what to do." }, { status: 400 });

  const proposal = await applyProposalClientAction(shareId, action);
  if (!proposal) return NextResponse.json({ error: "That didn't go through." }, { status: 400 });
  return NextResponse.json({ ok: true, proposal });
}
