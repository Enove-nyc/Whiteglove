import Link from "next/link";
import AdminContentManager from "@/components/AdminContentManager";
import { getAdminContent, getMissingContentReport } from "@/lib/admin-content";

export const dynamic = "force-dynamic";

type Missing = "" | "address" | "coordinates" | "shomer";

export default async function AdminContentPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; missing?: string }>;
}) {
  const { configured, bundle } = await getAdminContent();
  const report = getMissingContentReport(bundle);
  const query = await searchParams;
  // Which tab to open on, read on the server so the first paint is already
  // right. It used to be a #promotions hash, which a server never sees — the
  // page rendered one thing and the browser immediately replaced it.
  const initialTab =
    query.tab === "locations" || query.tab === "promotions" || query.tab === "accommodations" || query.tab === "suggestions"
      ? (query.tab as "locations" | "promotions" | "accommodations" | "suggestions")
      : undefined;
  const initialMissing = (["address", "coordinates", "shomer"].includes(query.missing ?? "") ? query.missing : "") as Missing;

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Content manager</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Edit the site settings, locations, accommodations, and suggestions from one place.</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Missing addresses" value={report.locationsMissingAddress} href="?tab=locations&missing=address" />
          <Metric label="Missing coordinates" value={report.locationsMissingCoordinates} href="?tab=locations&missing=coordinates" />
          <Metric label="Missing shomer" value={report.locationsMissingShomer} href="?tab=locations&missing=shomer" />
          <Metric label="Missing accommodations" value={report.accommodationsMissing} href="?tab=locations" />
          <Metric label="Pending suggestions" value={report.pendingSuggestions} href="?tab=locations" />
        </div>
      </section>

      <AdminContentManager initialBundle={bundle} configured={configured} initialTab={initialTab} initialMissing={initialMissing} />
    </>
  );
}

// Each count opens the list of the records it counts. A number nobody can act
// on is a number that gets ignored.
function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">{value}</p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-400">Show them →</p>
    </Link>
  );
}
