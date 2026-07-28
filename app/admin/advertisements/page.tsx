import Link from "next/link";
import AdminPromotionsManager from "@/components/AdminPromotionsManager";
import { getAdminContent } from "@/lib/admin-content";

export const dynamic = "force-dynamic";

export default async function AdminAdvertisementsPage() {
  const { configured, bundle } = await getAdminContent();

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Advertisements</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Create a banner, popup, sticky bar, or full-page ad. Choose where it appears, which pages it targets, and turn it on when it&apos;s ready.
            </p>
          </div>
          <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
        </div>
      </header>

      {!configured && (
        <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 text-sm leading-7 text-stone-600">
            The private store isn&apos;t connected yet, so ads can&apos;t be saved. Once your database (the same one running accounts and finances) is connected, this page saves automatically.
          </div>
        </div>
      )}

      <AdminPromotionsManager initialPromotions={bundle.promotions} configured={configured} />
    </>
  );
}
