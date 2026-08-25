import Link from "next/link";
import CspClearButton from "@/components/CspClearButton";
import TwoFactorPanel from "@/components/admin/TwoFactorPanel";
import { cspReportStoreAvailable, readCspSummary } from "@/lib/csp-reports";
import { readTwoFactor, SHARED_DOOR, twoFactorStorageAvailable } from "@/lib/admin-2fa-store";
import { describeAction, isWeighty, KEEP_DAYS } from "@/lib/admin-actions";
import { adminActionLogAvailable, readAdminActions } from "@/lib/admin-actions-store";
import { currentAdmin } from "@/lib/admin-current";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

/**
 * What the security policy has blocked, so it can be read.
 *
 * The policy in lib/csp-policy.ts now enforces, and still reports: a resource
 * it stops is both blocked and recorded here. Through the report-only phase
 * this table was how the policy was proven; now it is how a block is caught —
 * an empty table is the healthy state, and a row means a real page loaded
 * something the policy does not allow and it was stopped. That is worth seeing
 * fast, which is why enforcing did not also turn reporting off.
 */
export default async function AdminSecurityPage() {
  const summary = await readCspSummary();

  // Which door this session came through decides which factor is managed here.
  // Somebody on the shared password manages the shared one; somebody signed in
  // as themselves manages their own. Never a choice on screen — offering one
  // would let a holder of the shared password reach the owner's.
  const { identity } = await currentAdmin();
  const door = identity?.how === "account" ? identity.email : SHARED_DOOR;
  const doorLabel = identity?.how === "account" ? identity.email : "the shared admin password";
  const enrolled = twoFactorStorageAvailable() ? (await readTwoFactor(door)) !== null : false;

  const actions = adminActionLogAvailable() ? await readAdminActions() : [];

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <PageHeader eyebrow="White Glove admin" title="Security policy" />
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              The site tells the browser which outside services a page is allowed to load — maps, the booking
              search, the card form — and now <strong className="font-semibold text-[var(--navy)]">enforces</strong> it:
              anything not on the list is stopped. It still records what it stops, so a block shows up here rather than
              breaking a page in silence.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              An empty list is the healthy state. A line appearing means a real page loaded a service the rule does not
              allow and it was blocked — worth looking at, since it may be something to add.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
          >
            All settings
          </Link>
        </div>
      </header>

      {/* Above the report table: what is blocked matters, but who can get in
          at all matters more, and this screen is where somebody looks for it. */}
      {twoFactorStorageAvailable() ? (
        <TwoFactorPanel enrolled={enrolled} who={doorLabel} shared={door === SHARED_DOOR} />
      ) : (
        <div className="border border-[var(--gold-light)] bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Two-factor</p>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            This needs the private store connected before a second factor can be kept.
          </p>
        </div>
      )}

      {/* WHO CHANGED THE LOCKS. The sign-in log says who came in and the change
          log says what the content says; neither says that an account was
          granted the finances, a password was changed, or two-factor was
          turned off — which are the actions somebody takes when they should
          not be there at all. There is no button to empty this: a record the
          recorded party can erase is not a record. */}
      <section aria-labelledby="admin-actions-heading" className="border border-[var(--gold-light)] bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Who changed the locks</p>
        <h2 id="admin-actions-heading" className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
          {actions.length === 0 ? "Nothing has been changed" : "Every change to who can get in"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          {actions.length === 0
            ? "Access granted or taken away, a password changed, the site closed, two-factor turned on or off — each will be recorded here as it happens."
            : `Access granted or taken away, passwords changed, the site closed or opened, two-factor turned on or off. Kept for ${KEEP_DAYS} days, and there is deliberately no way to clear this from in here.`}
        </p>

        {actions.length > 0 && (
          <ul className="mt-5 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
            {actions.map((action, index) => (
              <li key={`${action.at}-${index}`} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                <span className="min-w-0 text-sm leading-6 text-stone-700">
                  {/* The ones worth noticing read differently, rather than
                      making somebody read the whole list to find one. */}
                  <span className={isWeighty(action.kind) ? "font-semibold text-[var(--navy)]" : undefined}>
                    {describeAction(action)}
                  </span>
                  {action.detail && <span className="block text-stone-500">{action.detail}</span>}
                </span>
                <span className="flex-none text-xs text-stone-500">
                  {new Date(action.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  {action.city || action.country ? ` · ${[action.city, action.country].filter(Boolean).join(", ")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto mt-10 max-w-4xl">
        {!cspReportStoreAvailable() ? (
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
            <p className="text-sm leading-7 text-stone-600">
              The private store is not connected, so reports cannot be collected. This is the same store the accounts
              system uses; once it is connected, reports appear here on their own.
            </p>
          </div>
        ) : summary.rows.length === 0 ? (
          <div className="border border-[var(--gold)] bg-[#fcfaf6] p-8">
            <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Nothing has been blocked.</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              The policy is enforcing and no page has loaded a service it does not allow. This empty state is the one to
              want — every page, the maps, the booking search and the card form are working within the rule. If a line
              ever appears here, it names a real service that was stopped, and it is worth a look.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              {summary.total.toLocaleString()} report{summary.total === 1 ? "" : "s"} so far, grouped by the service
              that was stopped. Highest first.
            </p>
            <div className="mt-5 overflow-x-auto border border-[var(--gold-light)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--cream-deep)] text-left">
                    <th className="px-4 py-3 font-semibold text-[var(--navy)]">Service that was stopped</th>
                    <th className="px-4 py-3 font-semibold text-[var(--navy)]">What it wanted to do</th>
                    <th className="px-4 py-3 text-right font-semibold text-[var(--navy)]">Times</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) => (
                    <tr key={`${row.directive}|${row.blocked}`} className="border-t border-[var(--gold-light)]">
                      <td className="px-4 py-3 font-mono text-[13px] text-[var(--navy)]">{row.blocked}</td>
                      <td className="px-4 py-3 text-stone-600">{describeDirective(row.directive)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-600">{row.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.samples.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                  The most recent examples, with the page each happened on
                </summary>
                <ul className="mt-3 space-y-1.5 text-[13px] text-stone-600">
                  {summary.samples.map((sample, index) => (
                    <li key={index} className="font-mono">
                      <span className="text-[var(--navy)]">{sample.blocked}</span> — {sample.directive} on{" "}
                      {sample.documentPath}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <CspClearButton />
          </>
        )}
      </section>
    </>
  );
}

/** The directive name, said in words the owner reads rather than a spec term. */
function describeDirective(directive: string): string {
  const map: Record<string, string> = {
    "script-src": "run a script",
    "connect-src": "make a background request",
    "frame-src": "open a frame",
    "img-src": "load an image",
    "style-src": "apply a stylesheet",
    "font-src": "load a font",
    "form-action": "submit a form to it",
    "media-src": "load audio or video",
    "default-src": "load something",
  };
  return map[directive] ?? directive;
}
