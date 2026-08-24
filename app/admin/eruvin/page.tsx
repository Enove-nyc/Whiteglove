import Link from "next/link";
import FlatFileListEditor, { type FlatFileItem } from "@/components/FlatFileListEditor";
import { addEruvAction, removeEruvAction } from "@/app/admin/eruvin/actions";
import { listAllEruvin } from "@/lib/eruvin";
import { eruvinStoreAvailable } from "@/lib/eruvin-store";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const FIELDS = [
  { name: "name", label: "Eruv name", required: true, placeholder: "The Golders Green Eruv" },
  { name: "sourceUrl", label: "Source link (https://…)", type: "url" as const, required: true, placeholder: "https://…" },
  { name: "city", label: "City", required: true, placeholder: "London" },
  { name: "country", label: "Country", required: true, placeholder: "United Kingdom" },
  { name: "covers", label: "What it covers (optional)", full: true, placeholder: "Golders Green, Hendon and Temple Fortune" },
  { name: "mapUrl", label: "Boundary map link (optional)", type: "url" as const, placeholder: "https://…" },
];

export default async function AdminEruvinPage() {
  const [listings, storeReady] = await Promise.all([listAllEruvin(), Promise.resolve(eruvinStoreAvailable())]);
  const items: FlatFileItem[] = listings.map((e) => ({
    id: e.id,
    added: Boolean(e.added),
    title: e.name,
    subtitle: [`${e.city}, ${e.country}`, e.covers].filter(Boolean).join(" · "),
    values: {
      name: e.name,
      city: e.city,
      country: e.country,
      covers: e.covers ?? "",
      sourceUrl: e.sourceUrl,
      mapUrl: e.mapUrl ?? "",
    },
  }));

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Eruvin" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Community eruvin for the public page. Each listing says the community maintains an eruv and links a source that
          establishes it — never a claim that the eruv is up — so the source link is the one field that must be a working
          web address. A boundary map is welcome where the community publishes one.
        </p>
      </header>

      <div className="mt-8">
        <Link
          href="/eruvin"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <FlatFileListEditor
        items={items}
        fields={FIELDS}
        addLabel="Add an eruv"
        emptyLabel="Nothing added yet. Eruvin you add appear here, alongside the built-in list on the public page."
        storeReady={storeReady}
        saveAction={addEruvAction}
        removeAction={removeEruvAction}
      />
    </>
  );
}
