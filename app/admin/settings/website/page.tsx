import Link from "next/link";
import AccessLog from "@/components/AccessLog";
import LockedSectionsControl from "@/components/LockedSectionsControl";
import SiteLockControl from "@/components/SiteLockControl";
import { getDashboardStats, getLockedPaths, getSampleTemplateStats } from "@/lib/site-analytics";
import { readSignIns, signInLogAvailable } from "@/lib/signin-log";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function WebsiteAccessSettings() {
  const [stats, lockedPaths, signIns, templates] = await Promise.all([
    getDashboardStats(),
    getLockedPaths(),
    readSignIns(100),
    getSampleTemplateStats(),
  ]);

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Website access" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Close the whole website while you are working on it, or close just a few parts. There are three ways in, and
          you choose which one each person gets.
        </p>
      </header>

      <div className="mt-8 space-y-5">
        <SiteLockControl initialLocked={stats.siteLocked} configured={stats.configured} />
        <LockedSectionsControl initialPaths={lockedPaths} available={stats.configured} />

        <section className="border border-[var(--gold-light)] bg-[#FAF8F3] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold-ink)]">Three ways in</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Who can see it while it is closed</h2>
          <dl className="mt-5 space-y-4 text-sm leading-6">
            <div>
              <dt className="font-semibold text-[var(--navy)]">The full code</dt>
              <dd className="text-stone-600">
                They type it once and stay in. For people who should keep coming back.{" "}
                <Link href="/admin/settings/passwords" className="underline decoration-[var(--gold)] underline-offset-2">
                  Change it
                </Link>
                .
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--navy)]">The five-minute code</dt>
              <dd className="text-stone-600">
                For handing to somebody who needs to check one thing. It stops working five minutes after they use it —
                enforced here, not left to their browser, so it cannot be kept.{" "}
                <Link href="/admin/settings/passwords" className="underline decoration-[var(--gold)] underline-offset-2">
                  Change it
                </Link>
                .
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--navy)]">By name, with no code at all</dt>
              <dd className="text-stone-600">
                Add somebody on{" "}
                <Link href="/admin/team" className="underline decoration-[var(--gold)] underline-offset-2">
                  Team
                </Link>{" "}
                and they get in by signing in to their own account. Nothing shared, and you can take it back from the
                same screen without changing anybody else&apos;s code.
              </dd>
            </div>
          </dl>
        </section>

        <section className="border border-[var(--gold-light)] bg-[#FAF8F3] p-6">
          <h2 className="text-xl font-semibold text-[var(--navy)]">Sample itinerary conversions</h2>
          {templates ? (
            <>
              <p className="mt-2 text-sm text-stone-600">
                Views include earlier traffic. Copies count successful saves since tracking began.
              </p>
              <ul className="mt-4 divide-y divide-[var(--gold-light)]">
                {templates.map(({ title, views, copies }) => (
                  <li key={title} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                    <span>{title}</span>
                    <span>{views} views · {copies} copies</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="mt-2 text-sm text-stone-600">Template analytics are unavailable.</p>}
        </section>

        <AccessLog entries={signIns} available={signInLogAvailable()} />
      </div>
    </>
  );
}
