import RecycleBin from "@/components/RecycleBin";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { KIND_AREA, RECYCLE_KINDS, type RecycleKind } from "@/lib/recycle";
import { listDeleted, onlyKinds, recycleStoreAvailable } from "@/lib/recycle-store";

export const dynamic = "force-dynamic";

/**
 * Everything deleted in the last month, and a way to put it back.
 *
 * Filtered by what this person may open. The bin holds records from two
 * different areas, and somebody granted only the directory has no business
 * reading which advertisement was taken down.
 */
export default async function AdminRecyclePage() {
  const { areas } = await currentAdmin();
  const allowed: RecycleKind[] | null = areas
    ? RECYCLE_KINDS.filter((kind) => mayUse(areas, KIND_AREA[kind]))
    : null;
  const rows = onlyKinds(await listDeleted(), allowed);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Recently deleted</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Everything removed in the last 30 days, newest first. Put anything back exactly as it was — the same record,
          not a copy.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-500">
          Pictures are not kept here. A photograph is stored as the picture itself, and a month of deleted ones would
          fill the private store — so delete a picture only when you mean it.
        </p>
      </header>

      <div className="mt-8">
        <RecycleBin rows={rows} today={today} storageReady={recycleStoreAvailable()} />
      </div>
    </>
  );
}
