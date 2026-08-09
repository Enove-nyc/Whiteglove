import Link from "next/link";
import AirportAdmin from "@/components/AirportAdmin";
import { AIRPORTS } from "@/data/airports";
import { mergeAirports, mergeMetros } from "@/lib/airport-admin";
import { airportStoreAvailable, readAirportEdits } from "@/lib/airport-store";

export const dynamic = "force-dynamic";

export default async function AdminAirportsPage() {
  const edits = await readAirportEdits();
  const merged = mergeAirports(edits.airports);
  const metros = mergeMetros(edits.metros);

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Airports</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              The {AIRPORTS.length} airports the site came with, plus any you add. This is what the flight search
              offers, what the planner measures driving times from, and how somebody typing a town name finds the
              airport nearest it.
            </p>
          </div>
          <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
        </div>
      </header>

      <AirportAdmin
        merged={merged}
        added={edits.airports}
        metros={metros}
        addedMetros={edits.metros}
        storeReady={airportStoreAvailable()}
      />
    </>
  );
}
