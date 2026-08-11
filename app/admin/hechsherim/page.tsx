import HechsherEditor, { type ConfirmedRow } from "@/components/HechsherEditor";
import { allHechsherim } from "@/data/hechsherim";
import { hechsherStoreAvailable, listAgencies, listHechsherim } from "@/lib/hechsher-store";

export const dynamic = "force-dynamic";

export default async function AdminHechsherimPage() {
  const [recorded, stored] = await Promise.all([listHechsherim(), listAgencies()]);
  const agencies = allHechsherim(stored);
  const ownAdded = new Set(stored.map((a) => a.id));

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Hechsherim</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Record supervision for White Glove&apos;s curated kosher listings. A badge appears only when you save a
          source-backed status. Nothing here is filled in automatically: a hechsher is a claim about kashrus, and the
          site only makes it on your word.
        </p>
      </header>

      <div className="mt-8">
        <HechsherEditor
          confirmed={recorded as ConfirmedRow[]}
          agencies={agencies}
          ownAdded={[...ownAdded]}
          storeReady={hechsherStoreAvailable()}
        />
      </div>
    </>
  );
}
