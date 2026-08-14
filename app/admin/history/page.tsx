import Link from "next/link";
import ChangeLog from "@/components/ChangeLog";
import { currentAdmin } from "@/lib/admin-current";
import { mayUse } from "@/lib/admin-permissions";
import { CHANGE_AREA, CHANGE_KINDS, type ChangeKind } from "@/lib/changes";
import { changeLogAvailable, listChanges, onlyChangeKinds } from "@/lib/changes-store";

export const dynamic = "force-dynamic";

/**
 * Everything edited in the last month, what it said before, and who did it.
 *
 * Narrowed to what this person may open: somebody granted only the directory
 * sees the kevarim and the listings, not what was rewritten on a page.
 */
export default async function AdminHistoryPage() {
  const { areas } = await currentAdmin();
  const allowed: ChangeKind[] | null = areas ? CHANGE_KINDS.filter((kind) => mayUse(areas, CHANGE_AREA[kind])) : null;
  const changes = onlyChangeKinds(await listChanges(), allowed);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">History</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Edits from the last 30 days. Put any of them back.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-500">
          Deletions are in{" "}
          <Link href="/admin/recycle" className="underline decoration-[var(--gold)] underline-offset-4">
            Deleted
          </Link>
          .
        </p>
      </header>

      <div className="mt-8">
        <ChangeLog changes={changes} today={new Date().toISOString().slice(0, 10)} storageReady={changeLogAvailable()} />
      </div>
    </>
  );
}
