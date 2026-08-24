import Link from "next/link";
import FlatFileListEditor, { type FlatFileItem } from "@/components/FlatFileListEditor";
import { addApartmentAction, removeApartmentAction } from "@/app/admin/kosher-apartments/actions";
import { listAllApartmentProviders } from "@/lib/kosher-apartments";
import { apartmentsStoreAvailable } from "@/lib/kosher-apartments-store";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const FIELDS = [
  { name: "name", label: "Name", required: true, placeholder: "Kosher Apartments Jerusalem" },
  { name: "area", label: "Where they cover", required: true, placeholder: "Jerusalem · or Worldwide" },
  { name: "note", label: "What they are (optional)", full: true, placeholder: "Short-term flats near the Old City, kosher kitchens." },
  { name: "url", label: "Website (https://…)", type: "url" as const, placeholder: "https://…" },
  { name: "phone", label: "Phone", placeholder: "+972 …" },
  { name: "whatsapp", label: "WhatsApp", placeholder: "+972 …" },
];

export default async function AdminKosherApartmentsPage() {
  const [listings, storeReady] = await Promise.all([
    listAllApartmentProviders(),
    Promise.resolve(apartmentsStoreAvailable()),
  ]);
  const items: FlatFileItem[] = listings.map((p) => ({
    id: p.id,
    added: Boolean(p.added),
    title: p.name,
    subtitle: [p.area, p.note].filter(Boolean).join(" · "),
    values: {
      name: p.name,
      area: p.area,
      note: p.note ?? "",
      url: p.url ?? "",
      phone: p.phone ?? "",
      whatsapp: p.whatsapp ?? "",
    },
  }));

  return (
    <>
      <header>
        <PageHeader eyebrow="White Glove admin" title="Kosher apartments" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The sites, agencies and hosts that rent kosher-equipped apartments and vacation flats — for the Where to stay
          page. These are where a traveller goes to <em>find</em> an apartment, not a booking we take. Each needs at least
          one way to reach it: a website, a phone number, or a WhatsApp number.
        </p>
      </header>

      <div className="mt-8">
        <Link
          href="/hotels"
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]"
        >
          View public page
        </Link>
      </div>

      <FlatFileListEditor
        items={items}
        fields={FIELDS}
        addLabel="Add a provider"
        emptyLabel="Nothing added yet. Providers you add appear here, and in the Kosher apartments section of the Where to stay page."
        storeReady={storeReady}
        saveAction={addApartmentAction}
        removeAction={removeApartmentAction}
      />
    </>
  );
}
