import { NextRequest, NextResponse } from "next/server";
import { subscribeAlert } from "@/lib/email-alerts-store";
import { rateLimit, requesterKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  for (const key of [`alerts:${requesterKey(request.headers)}`]) {
    const limited = await rateLimit(key, { limit: 8, windowSeconds: 60 * 60 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Please wait ${limited.retryAfter} seconds before trying again.` },
        { status: 429 },
      );
    }
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    topics?: unknown;
    destinationSlug?: string;
    destinationQuery?: string;
    sourcePage?: string;
    consented?: boolean;
  } | null;

  const result = await subscribeAlert({
    email: body?.email ?? "",
    topics: body?.topics,
    destinationSlug: body?.destinationSlug,
    destinationQuery: body?.destinationQuery,
    sourcePage: body?.sourcePage,
    consented: Boolean(body?.consented),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  const messages = {
    created: "You are signed up. We will only email you about what you chose.",
    updated: "Your preferences were updated.",
    duplicate: "You are already signed up for those updates.",
  } as const;

  return NextResponse.json({
    ok: true,
    status: result.status,
    message: messages[result.status],
  });
}
