import Link from "next/link";
import AdminCatalogList from "@/components/AdminCatalogList";
import { listAdminCatalog } from "@/lib/admin-listing-catalog";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminDirectoryFoodPage() {
  const entries = await listAdminCatalog("food");
  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin · directory" title="Kosher food" />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Food listings already on the site. Kashrus claims stay on this queue and on destination listings — not on
          attractions or lodging.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/destinations"
            className="inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
          >
            Open towns
          </Link>
          <Link
            href="/admin/imports/needs-review"
            className="inline-flex min-h-11 items-center border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
          >
            Needs review
          </Link>
        </div>
      </header>
      <AdminCatalogList entries={entries} empty="No kosher food listings are listed yet." />
    </>
  );
}
