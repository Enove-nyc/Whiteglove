import Link from "next/link";
import AdminExpenses from "@/components/AdminExpenses";

export const dynamic = "force-dynamic";

export default function AdminFinancesPage() {
  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Finances</h1>
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
