import Link from "next/link";
import AdminExpenses from "@/components/AdminExpenses";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function AdminFinancesPage() {
  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <PageHeader eyebrow="White Glove admin" title="Finances" />
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Log every expense — flights, hotels, marketing, software, fees — and see your totals by category and month. Private to the owner.</p>
          </div>
          <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
        </div>
      </header>
      <section className="mt-8">
        <AdminExpenses />
      </section>
    </>
  );
}
