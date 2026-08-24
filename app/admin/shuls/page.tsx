import Link from "next/link";
import FlatFileListEditor, { type FlatFileItem } from "@/components/FlatFileListEditor";
import { addShulAction, removeShulAction } from "@/app/admin/shuls/actions";
import { listPublishedShuls } from "@/lib/shuls";
import { shulsStoreAvailable } from "@/lib/shuls-store";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const FIELDS = [
  { name: "name", label: "Shul name", required: true, placeholder: "Bevis Marks Synagogue" },
  { name: "sourceUrl", label: "Source link (https://…)", type: "url" as const, required: true, placeholder: "https://…" },
  { name: "city", label: "City", required: true, placeholder: "London" },
  { name: "country", label: "Country", required: true, placeholder: "United Kingdom" },
  { name: "address", label: "Address (optional)", full: true, placeholder: "4 Heneage Lane, London EC3A 5DQ" },
  { name: "website", label: "Website (optional)", type: "url" as const, placeholder: "https://…" },
  { name: "phone", label: "Phone (optional)", placeholder: "+44 …" },
  { name: "coordinates", label: "Coordinates (optional)", placeholder: "51.5144, -0.0792" },
  { name: "notes", label: "Notes (optional)", full: true, placeholder: "Sephardi; the oldest in the UK." },
];

export default async function AdminShulsPage() {
  const [listings, storeReady] = await Promise.all([listPublishedShuls(), Promise.resolve(shulsStoreAvailable())]);
  const items: FlatFileItem[] = listings.map((s) => ({
    id: s.id,
    added: Boolean(s.added),
    title: s.name,
    subtitle: [`${s.city}, ${s.country}`, s.coordinates ? "on the map" : ""].filter(Boolean).join(" · "),
    values: {
      name: s.name,
      city: s.city,
      country: s.country,
      address: s.address ?? "",
      website: s.website ?? "",
      phone: s.phone ?? "",
      coordinates: s.coordinates ?? "",
      notes: s.notes ?? "",
      sourceUrl: s.sourceUrl,
    },
  }));

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Shuls" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Shuls and minyanim for the public directory. Most come from the towns&rsquo; own write-ups and the built-in
          catalog; the ones you add here belong to no town on the site. Each needs a source, and coordinates put it on
          the map. Hours are not stored — a shul&rsquo;s zmanim change, so the link is how a reader gets them.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/destinations"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Add a shul under a town
        </Link>
        <Link
          href="/shuls"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <FlatFileListEditor
        items={items}
        fields={FIELDS}
        addLabel="Add a shul"
        emptyLabel="Nothing added yet. Shuls you add appear here, alongside the built-in directory on the public page."
        storeReady={storeReady}
        saveAction={addShulAction}
        removeAction={removeShulAction}
      />
    </>
  );
}
