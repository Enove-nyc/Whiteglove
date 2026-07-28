import Link from "next/link";
import AdminInventoryManager from "@/components/AdminInventoryManager";
import { getEditableInventory } from "@/lib/admin-inventory";

export default async function AdminInventoryPage() {
  const inventory = await getEditableInventory();

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Page inventory</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Sort every page and issue by status, then add owner notes for the missing information you have.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">View website</Link>
          </div>
        </div>
      </header>
      <AdminInventoryManager initialItems={inventory.items} configured={inventory.configured} />
    </>
  );
}
