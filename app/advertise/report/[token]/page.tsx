import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { getAdminContent } from "@/lib/admin-content";
import { advertiserByReportToken, listCampaigns } from "@/lib/advertising-store";
import { reportForAdvertiser, reportIsEmpty } from "@/lib/advertiser-report";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * What one advertiser is owed to see.
 *
 * Reached by a token, not by signing in. The address is private (robots and
 * the sitemap both refuse it) and the page itself refuses indexing. A wrong
 * token is a 404 — the same as a missing page — rather than a message that
 * confirms the report door exists.
 *
 * Totals only, and the same floor lib/ad-performance.ts already uses: a rate
 * is not printed until there are enough views for it to mean anything. There
 * is no time series behind these counts yet, so none is shown.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const advertiser = await advertiserByReportToken(token);
  return pageMetadata({
    title: advertiser ? `Advertising report — ${advertiser.name || "White Glove"}` : "Report not found",
    description: "A private advertising report.",
    path: `/advertise/report/${token}`,
    noIndex: true,
  });
}

export default async function AdvertiserReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const advertiser = await advertiserByReportToken(token);
  if (!advertiser) notFound();

  const [{ bundle }, campaigns] = await Promise.all([getAdminContent(), listCampaigns()]);
  const report = reportForAdvertiser(advertiser, bundle.promotions, campaigns);
  const empty = reportIsEmpty(report);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Advertising report</p>
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)]">
          {advertiser.name || "Your placements"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Figures are what has been counted on this site. A percentage is shown only when there have been enough views
          for it to mean anything.
        </p>

        {empty ? (
          <p className="mt-10 border border-dashed border-[var(--gold-light)] p-8 text-sm leading-6 text-stone-600">
            Nothing is running for this account yet. When a placement is published, the totals will appear here.
          </p>
        ) : (
          <div className="mt-10 space-y-8">
            {report.campaigns.map((group) =>
              group.ads.length === 0 ? null : (
                <section key={group.campaign.id}>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
                    {group.campaign.name}
                  </h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-stone-500">{group.campaign.status}</p>
                  <ul className="mt-4 space-y-3">
                    {group.ads.map((ad) => (
                      <li key={ad.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                        <p className="font-semibold text-[var(--navy)]">{ad.title}</p>
                        <p className="mt-1 text-sm text-stone-600">{ad.says}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
            {report.ungrouped.length > 0 && (
              <section>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Placements</h2>
                <ul className="mt-4 space-y-3">
                  {report.ungrouped.map((ad) => (
                    <li key={ad.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-4">
                      <p className="font-semibold text-[var(--navy)]">{ad.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{ad.says}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
