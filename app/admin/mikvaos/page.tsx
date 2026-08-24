import Link from "next/link";
import MikvaosEditor, { type MikvahRow } from "@/components/MikvaosEditor";
import { saveMikvahAction, deleteMikvahAction } from "@/app/admin/mikvaos/actions";
import { isDbEnabled } from "@/lib/content-admin";
import { listMikvaosForAdmin } from "@/lib/mikvaos";

export const dynamic = "force-dynamic";

export default async function AdminMikvaosPage() {
  const listings = await listMikvaosForAdmin();
  const dbConnected = isDbEnabled();
  const rows: MikvahRow[] = listings.map((listing) => ({
    id: listing.id,
    name: listing.name,
    city: listing.city,
    country: listing.country,
    status: listing.status,
    sourceUrl: listing.sourceUrl,
    address: listing.address,
    phone: listing.phone,
    hours: listing.hours,
    website: listing.website,
    notes: listing.notes,
    fromDatabase: listing.fromDatabase,
    townHref: `/admin/destinations?slug=${encodeURIComponent(listing.destinationSlug)}`,
  }));

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Mikvaos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Every mikvah listing across the site. Press one to fix its details in place — hours, phone, address, source,
          and whether it is published. The few that live in the built-in catalog open in their town instead. A listing
          needs a source before it can appear on the public page.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/destinations"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Add a mikvah under a town
        </Link>
        <Link
          href="/mikvaos"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <MikvaosEditor
        rows={rows}
        dbConnected={dbConnected}
        saveAction={saveMikvahAction}
        deleteAction={deleteMikvahAction}
      />
    </>
  );
}
