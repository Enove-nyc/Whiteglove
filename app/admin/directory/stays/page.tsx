import Link from "next/link";
import AdminCatalogList from "@/components/AdminCatalogList";
import { listAdminCatalog } from "@/lib/admin-listing-catalog";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminDirectoryStaysPage() {
  const entries = await listAdminCatalog("stay");
  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin · directory" title="Where to stay" />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Places to stay already on the site. Ordinary lodging is fine when it suits the trip; a kosher hotel is better
          when there is one. Add another from Add.
        </p>
        <Link
          href="/admin/add"
          className="mt-5 inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Add a place to stay
        </Link>
      </header>
      <AdminCatalogList entries={entries} empty="No places to stay are listed yet." />
    </>
  );
}
