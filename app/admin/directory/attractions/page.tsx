import Link from "next/link";
import AdminCatalogList from "@/components/AdminCatalogList";
import { listAdminCatalog } from "@/lib/admin-listing-catalog";

export const dynamic = "force-dynamic";

export default async function AdminDirectoryAttractionsPage() {
  const entries = await listAdminCatalog("attraction");
  return (
    <>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin · directory</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Things to do</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Attractions already on the site. Add another from Add. Audience-appropriate is not kosher-only — parks,
          museums and ordinary sightseeing are fine when Orthodox / Torah-observant travelers would go.
        </p>
        <Link
          href="/admin/add"
          className="mt-5 inline-flex min-h-11 items-center border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Add an attraction
        </Link>
      </header>
      <AdminCatalogList entries={entries} empty="No attractions are listed yet." />
    </>
  );
}
