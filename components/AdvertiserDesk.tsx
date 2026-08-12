import { siteOrigin } from "@/lib/seo";
import type { Advertiser } from "@/lib/advertisers";
import type { Campaign } from "@/lib/campaigns";
import type { Promotion } from "@/lib/admin-content";
import { performance } from "@/lib/ad-performance";

/**
 * The advertisers behind the creatives, and the report each one is owed.
 *
 * Server-rendered: these numbers are the owner's, and a client fetch would
 * duplicate the promotions already on the page. The report address is a
 * capability URL — anyone with it can see that advertiser's totals, so it is
 * shown here and nowhere public.
 */
export default function AdvertiserDesk({
  advertisers,
  campaigns,
  promotions,
}: {
  advertisers: Advertiser[];
  campaigns: Campaign[];
  promotions: Promotion[];
}) {
  const origin = siteOrigin()?.toString().replace(/\/$/, "") ?? "";

  if (advertisers.length === 0) {
    return (
      <p className="mt-10 text-sm leading-6 text-stone-600">
        Advertisers appear here once a creative is saved with a company name or
        email. Each one gets a report address you can send them — it shows their
        own totals, and nothing else.
      </p>
    );
  }

  return (
    <section className="mt-14">
      <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Advertisers</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
        One record per business. The report address is theirs to open; it never
        shows another advertiser&apos;s numbers, and it does not invent a rate
        when there have not been enough views to support one.
      </p>
      <ul className="mt-6 grid gap-5 lg:grid-cols-2">
        {advertisers.map((advertiser) => {
          const theirs = campaigns.filter((campaign) => campaign.advertiserId === advertiser.id);
          const ads = promotions.filter(
            (ad) =>
              ad.advertiserId === advertiser.id ||
              (advertiser.email && ad.advertiserEmail.trim().toLowerCase() === advertiser.email),
          );
          const reportHref = origin && advertiser.reportToken ? `${origin}/advertise/report/${advertiser.reportToken}` : "";
          return (
            <li key={advertiser.id} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                {advertiser.name || advertiser.email || "Unnamed advertiser"}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {[advertiser.email, advertiser.phone].filter(Boolean).join(" · ") || "No contact recorded"}
              </p>
              <p className="mt-3 text-sm text-stone-600">
                {theirs.length} campaign{theirs.length === 1 ? "" : "s"} · {ads.length} creative
                {ads.length === 1 ? "" : "s"}
              </p>
              {ads.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ads.map((ad) => (
                    <li key={ad.id} className="text-sm leading-6 text-stone-600">
                      {ad.title || "Untitled"} — {performance(ad).says}
                    </li>
                  ))}
                </ul>
              )}
              {reportHref ? (
                <p className="mt-4 break-all text-xs leading-5 text-stone-500">
                  Report:{" "}
                  <a href={reportHref} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
                    {reportHref}
                  </a>
                </p>
              ) : (
                <p className="mt-4 text-xs leading-5 text-stone-500">
                  A report address appears once the site address is configured.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
