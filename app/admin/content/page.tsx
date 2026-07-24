import Link from "next/link";
import AdminContentManager from "@/components/AdminContentManager";
import { getAdminContent, getMissingContentReport } from "@/lib/admin-content";

export default async function AdminContentPage() {
  const { configured, bundle } = await getAdminContent();
  const report = getMissingContentReport(bundle);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--gold-light)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Content manager</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Edit the site settings, locations, accommodations, and suggestions from one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/admin/inventory" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Page inventory</Link>
            <Link href="/admin/content#promotions" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Promotions</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Missing addresses" value={report.locationsMissingAddress} />
          <Metric label="Missing coordinates" value={report.locationsMissingCoordinates} />
          <Metric label="Missing shomer" value={report.locationsMissingShomer} />
          <Metric label="Missing accommodations" value={report.accommodationsMissing} />
          <Metric label="Pending suggestions" value={report.pendingSuggestions} />
        </div>
      </section>

      <AdminContentManager initialBundle={bundle} configured={configured} />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{label}</p><p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{value}</p></div>;
}
