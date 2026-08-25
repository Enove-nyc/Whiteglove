import { NextRequest, NextResponse } from "next/server";
import { CHECKS, describeTransition, foldResults, tellAbout } from "@/lib/health-checks";
import { runHealthChecks } from "@/lib/health-probes";
import { healthStoreAvailable, readHealth, writeHealth } from "@/lib/health-store";
import { sendHealthChangeEmail } from "@/lib/email";
import { isPhoneIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * Finds out whether the things this site depends on are actually working, and
 * says so only when the answer changes.
 *
 * WHY A JOB AND NOT A BUTTON. lib/connections.ts already says "set is not the
 * same as working" and points at the test buttons beside it. The buttons work.
 * Nobody presses them — and the failure they catch is the quiet kind: a key
 * expires, an account runs out of credit, a service moves an endpoint, and one
 * feature stops while every screen goes on saying the variable is set. Nobody
 * notices until a traveller does.
 *
 * FREE READS ONLY, and the ones this does not check are named on the screen —
 * see NOT_CHECKED in lib/health-checks.ts. A nightly job that spends money to
 * tell the owner what he mostly already knows is one he turns off.
 *
 * TOLD ON CHANGE, NEVER ON STATE. An email each night saying all is well is
 * one somebody filters, and the night it says otherwise it is filtered too. So
 * the previous answers are kept and only a difference is sent: the night a
 * thing breaks, and the night it comes back. The first run tells nobody
 * anything — there is nothing to compare against, and a fresh deployment would
 * otherwise email about every connection it has not set up yet.
 *
 * Same secret and same fail-closed rule as the other cron endpoints.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] health ran but CRON_SECRET is not set.");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (!healthStoreAvailable()) {
    // Nowhere to remember last night's answers, so nothing could be compared
    // against them. Said rather than silently reporting everything as new.
    return NextResponse.json({ error: "This needs the private store connected." }, { status: 503 });
  }

  const before = await readHealth();
  const results = await runHealthChecks();
  await writeHealth(foldResults(before, results));

  const transitions = tellAbout(before, results);
  let told = false;

  if (transitions.length) {
    const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
    if (owner && !isPhoneIdentity(owner)) {
      const broke = transitions
        .filter((transition) => transition.broke)
        .map((transition) => {
          const meta = CHECKS.find((check) => check.id === transition.id);
          return { what: meta?.what ?? transition.id, detail: transition.detail, without: meta?.without ?? "" };
        });
      const fixed = transitions
        .filter((transition) => !transition.broke)
        .map((transition) => CHECKS.find((check) => check.id === transition.id)?.what ?? transition.id);
      told = await sendHealthChangeEmail(owner, {
        broke,
        fixed,
        url: new URL("/admin/settings/connections", request.nextUrl.origin).toString(),
      }).catch(() => false);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: results.length,
    failing: results.filter((result) => !result.ok).length,
    // Named rather than counted, so a run's log says which thing changed.
    changed: transitions.map(describeTransition),
    told,
  });
}
