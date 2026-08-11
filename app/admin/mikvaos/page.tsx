import Link from "next/link";
import { listMikvaosForAdmin } from "@/lib/mikvaos";

export const dynamic = "force-dynamic";

export default async function AdminMikvaosPage() {
  const listings = await listMikvaosForAdmin();
  const needsAttention = listings.filter((item) => item.status !== "PUBLISHED" || !item.sourceUrl);
  const published = listings.filter((item) => item.status === "PUBLISHED" && item.sourceUrl);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Mikvaos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Every mikvah listing across towns. Edit one by opening its town — they use the same PracticalPlace form as
          minyanim and Shabbos notes. A listing needs a source URL before it can appear on the public site.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          {published.length} published · {needsAttention.length} need attention · {listings.length} total
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/destinations"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Open town editor
        </Link>
        <Link
          href="/mikvaos"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-10 max-w-xl text-sm leading-6 text-stone-600">
          No mikvah listings yet. Add one under a town in the destination editor, choose category Mikvaos, and include
          the source URL.
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gold-light)] text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Town</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Source</th>
                <th className="py-3">Edit</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b border-[var(--gold-light)] align-top">
                  <td className="py-3 pr-4 font-semibold text-[var(--navy)]">{listing.name}</td>
                  <td className="py-3 pr-4 text-stone-600">
                    {listing.city}, {listing.country}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        listing.status === "PUBLISHED" && listing.sourceUrl
                          ? "text-emerald-800"
                          : "text-amber-800"
                      }
                    >
                      {listing.status === "PUBLISHED" && !listing.sourceUrl
                        ? "Needs source"
                        : listing.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {listing.sourceUrl ? (
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                      >
                        Source
                      </a>
                    ) : (
                      <span className="text-amber-800">Missing</span>
                    )}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/admin/destinations?slug=${encodeURIComponent(listing.destinationSlug)}`}
                      className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
                    >
                      Town
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
