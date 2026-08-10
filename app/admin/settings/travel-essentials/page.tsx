import Link from "next/link";
import TravelEssentialsForm from "@/components/TravelEssentialsForm";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { OWNER_PROGRAMME_CHECKLIST } from "@/lib/travel-essentials";
import { readTravelEssentialsFresh, travelEssentialsStoreAvailable } from "@/lib/travel-essentials-store";

export const dynamic = "force-dynamic";

const card = "rounded-xl border border-[var(--gold-light)] bg-[#fffdf9] p-5 sm:p-6";

export default async function TravelEssentialsAdminPage() {
  const storeReady = travelEssentialsStoreAvailable();
  const [settings, affiliate] = await Promise.all([readTravelEssentialsFresh(), readAffiliateConfig()]);

  return (
    <div className="pb-12">
      <header>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Earnings</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">
              Travel Essentials
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Structured offers for destinations, the itinerary planner and the booking page — insurance, eSIM,
              transfers, tours, cars, flights and places to stay. Only services you enable with a real hand-off appear.
              Nothing is invented.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/settings/earnings"
              className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
            >
              Search earnings
            </Link>
            <Link
              href="/admin/settings"
              className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      {!storeReady && (
        <p className={`${card} mt-7 text-sm text-amber-900`}>
          Waiting on the private store. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, then return here.
        </p>
      )}

      <section className={`${card} mt-7`}>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Owner programme checklist</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Confirm each programme in your Stay22 / Travelpayouts dashboards before enabling it. This site does not
          register providers or invent approvals.
        </p>
        <ul className="mt-4 space-y-3">
          {OWNER_PROGRAMME_CHECKLIST.map((row) => (
            <li key={row.category} className="border-t border-[var(--gold-light)] pt-3 text-sm leading-6 text-stone-600">
              <span className="font-semibold text-[var(--navy)]">{row.category}</span>
              <span className="mt-1 block">{row.status}</span>
              <Link
                href={row.where}
                className="mt-1 inline-block text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)] underline"
              >
                Open {row.where.replace("/admin/", "")}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Services</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Enable or disable each card, paste approved tracked URLs for landing offers, set page types, optional
          destination slugs, CTAs and display order. Search hand-offs use the partners configured under{" "}
          <Link href="/admin/settings/earnings" className="underline decoration-[var(--gold)] underline-offset-2">
            What the searches earn
          </Link>
          .
        </p>
        <TravelEssentialsForm current={settings} affiliate={affiliate} storeReady={storeReady} />
      </section>
    </div>
  );
}
