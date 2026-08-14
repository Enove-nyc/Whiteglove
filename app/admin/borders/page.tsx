import BorderCrossingsEditor from "@/components/BorderCrossingsEditor";
import { bordersNeedingACheck } from "@/lib/border-crossings";
import { allCrossings, borderStoreAvailable } from "@/lib/border-store";

export const dynamic = "force-dynamic";

export default async function AdminBordersPage() {
  const crossings = await allCrossings();
  // Worked out on the server and handed down, so nothing asks what day it is
  // while React is rendering.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Borders</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          The route planner has always warned that leaving the EU takes hours. This is where it learns which crossing
          to name and what it was actually like. The crossings themselves come with the site; what you write down is
          what was open, roughly how long, and the day you checked.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
          A check stops being quoted as current after a month. That is deliberate — a queue length from March, shown in
          August as though somebody had just looked, is worse than saying nobody has checked.
        </p>
      </header>

      <div className="mt-8">
        <BorderCrossingsEditor
          crossings={crossings}
          today={today}
          storageReady={borderStoreAvailable()}
          needACheck={bordersNeedingACheck(crossings, today)}
        />
      </div>
    </>
  );
}
