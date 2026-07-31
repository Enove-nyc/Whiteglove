import AdManager from "@/components/AdManager";
import { getAdminContent } from "@/lib/admin-content";

export const dynamic = "force-dynamic";

export default async function AdminAdvertisementsPage() {
  const { configured, bundle } = await getAdminContent();

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Advertisements</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          A banner, a popup, something inside a page, or a full-screen promotion. Five short steps, a preview on both a
          computer and a phone, and you decide at the end whether to publish it or keep it as a draft.
        </p>
      </header>

      <div className="mt-8">
        <AdManager initial={bundle.promotions} configured={configured} today={new Date().toISOString().slice(0, 10)} />
      </div>
    </>
  );
}
