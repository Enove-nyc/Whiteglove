import HechsherEditor, { type ConfirmedRow } from "@/components/HechsherEditor";
import { hechsherStoreAvailable, listHechsherim } from "@/lib/hechsher-store";

export const dynamic = "force-dynamic";

export default async function AdminHechsherimPage() {
  const recorded = (await listHechsherim()) as ConfirmedRow[];

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Hechsherim</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Who certifies each kosher place. The kosher finder shows a circle beside every listing — the agency&apos;s mark
          once you have confirmed it, and <strong>Unverified</strong> until then. Nothing here is filled in
          automatically: a hechsher is a claim about kashrus, and the site only makes it on your word.
        </p>
      </header>

      <div className="mt-8">
        <HechsherEditor confirmed={recorded} storeReady={hechsherStoreAvailable()} />
      </div>
    </>
  );
}
